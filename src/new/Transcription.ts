import path from "path";
import fs from 'fs';
import { Readable, Writable } from "stream";
import axios, { AxiosResponse } from "axios";
import { openai } from "../neuro";
import ffmpeg from "fluent-ffmpeg";
import { User } from "../entity/User";
import { AudioFile } from "../entity/assistants/AudioFile";
import { AppDataSource } from "../data-source";
import { Converter } from "./Converter";



const manager = AppDataSource.manager;

/**
 * Class for transcribing audio
 */
export class Transcription {




  /**
   * COnstructor
   * @param exists Whether the file exists in the database
   * @param urlOrId File url or id in the db
   * @param prompt prompt to transcribe
   */
  constructor(private exists: boolean, private urlOrId: string, private prompt?: string) {}

  /**
   * Internal chunk number
   */
  private i: number = 0;

  /**
   * Transcription result
   */
  private result: string = "";

  /**
   * Instance in the database
   */
  private inDB: AudioFile | null = null;

  /**
   * Audio data buffer
   */
  private buffer: Buffer | null = null;

  /**
   * Function that is used in the stream to write data
   * @param chunk Audio chunk
   * @param encoding Encoding
   * @param callback Callback
   */
  private async write(
    chunk: Buffer,
    encoding: string,
    callback: (err?: Error) => void,
  ) {
    let f = new File([chunk], `${this.i}-${path.basename(this.urlOrId)}`);
    openai.audio.transcriptions
      .create({
        file: f,
        model: "gpt-4o-transcribe",
        prompt: this.prompt,
      })
      .then((transcription) => {
        this.result += transcription.text;
        this.i++;
        callback();
      })
      .catch(() => callback(new Error("Error transcribing")));
  }

  /**
   * Transcribe this audio
   * @returns transcription result
   */
  public async transcribe(): Promise<string> {
    if (!this.buffer) throw new Error("Buffer is null");
    if (this.buffer.length > 25 * 1024 * 1024) {
      const str = new Readable();
      str.push(this.buffer);
      str.push(null);
      await new Promise<void>((resolve, reject) => {
        let i = 0;
        const outputStream = new Writable({
          write: this.write.bind(this),
          final() {
            resolve();
          },
        });

        ffmpeg(str)
          .outputOptions([
            "-f segment",
            "-segment-time 600",
            "-reset_timestamps 1",
            "-map 0:a",
          ])
          .on("end", async () => {})
          .on("error", reject)
          .pipe(outputStream, {
            end: true,
          });
      });
    } else {
      const f = new File([this.buffer], path.basename(this.urlOrId));
      const transcription = await openai.audio.transcriptions.create({
        file: f,
        model: "gpt-4o-transcribe",
        prompt: this.prompt,
      });
      this.result = transcription.text;
    }
    return this.result;
  }

  /**
   * Get the cost of the transcription (non-fs only)
   * @returns Cost IN SMT
   */
  public async getCost(): Promise<number> {
    if (this.buffer) throw new Error("Buffer is null");


    const stream = new Readable();
    stream.push(this.buffer);
    stream.push(null);
    const dur: number = await new Promise((resolve, reject) => {
      ffmpeg(stream)
      .ffprobe( async (err, data) => {
        if (err) reject(err);
        resolve(+data.streams[0].duration!)
      });   
    })

    return Converter.USDSMT(dur / 60 * 0.06);
  }

  /**
   * Save the audio file to the database and to the file system
   * @param user User
   * @returns File object
   */
  public async save(user: User) {
    if (this.exists || this.inDB) throw new Error("File already exists");
    if (!this.buffer) throw new Error("Buffer is null");
    this.inDB = new AudioFile();
    this.inDB.extension = path.extname(this.urlOrId);
    this.inDB.user = user;
    this.inDB.userId = user.chatId;
    await manager.save(this.inDB);

    fs.writeFileSync(path.join(process.cwd(), 'audio', this.inDB.id + this.inDB.extension), this.buffer);
    return this.inDB;
  }


  /**
   * Setup the audio
   */
  public async setup() {
    if (this.exists) {
      this.inDB = await manager.findOneBy(AudioFile, {
        id: this.urlOrId
      });
      if (!this.inDB) throw new Error("File not found");
      this.buffer = fs.readFileSync(path.join(process.cwd(), 'audio', this.inDB.id + this.inDB.extension))
    } else {
      const res = await axios.get(this.urlOrId, {
        responseType: 'arraybuffer'
      });
      this.buffer = res.data;
    }
  }


  /**
   * Delete the file, if saved
   */
  public async remove() {
    if (!this.exists) throw new Error("File not in the database!");
    if (!this.inDB) throw new Error("File not set up!");
    fs.rmSync(path.join(process.cwd(), 'audio', this.inDB.id + this.inDB.extension));
    await manager.remove(this.inDB);
  }
}

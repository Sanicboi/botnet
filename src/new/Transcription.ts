import axios, { AxiosResponse } from "axios";
import path from "path";
import { Readable, Writable } from "stream";
import { openai } from "../neuro";
import ffmpeg from "fluent-ffmpeg";

export class Transcription {
  constructor(
    private url: string,
    private prompt?: string,
  ) {}

  private i: number = 0;
  private result: string = "";

  private async write(
    chunk: Buffer,
    encoding: string,
    callback: (err?: Error) => void,
  ) {
    let f = new File([chunk], `${this.i}-${path.basename(this.url)}`);
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

  public async transcribe(): Promise<string> {
    const { data }: AxiosResponse<Buffer> = await axios.get(this.url, {
      responseType: "arraybuffer",
    });
    if (data.length > 25 * 1024 * 1024) {
      const str = new Readable();
      str.push(data);
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
      const f = new File([data], path.basename(this.url));
      const transcription = await openai.audio.transcriptions.create({
        file: f,
        model: "gpt-4o-transcribe",
        prompt: this.prompt,
      });
      this.result = transcription.text;
    }
    return this.result;
  }
}

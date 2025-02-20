import axios from "axios";
import ffmpeg from "fluent-ffmpeg"
import fs from "fs";
//@ts-ignore
import {audioToSlice} from "audio-slicer";
import { AudioFile } from "../entity/assistants/AudioFile";
import path from "path";
import { User } from "../entity/User";
import { Router } from "./router";
import { v4 } from "uuid";
import { openai } from ".";

export class AudioInput {

    
    public inDB: AudioFile;
    

    constructor(private idOrUrl: string) {

    }   

    public async initFromUrl(user: User): Promise<void> {
        const response = await axios.get(this.idOrUrl, {
            responseType: "arraybuffer"
        });
        const ext = path.extname(this.idOrUrl);
        const n = "probe-" + v4() + ext;
        const p = path.join(process.cwd(), 'voice', n);
        fs.writeFileSync(p, response.data);

        const data: {duration: number, size: number} = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(p, (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({
                    duration: data.format.duration!,
                    size: data.format.size!
                })
            })
        });
        fs.rmSync(p);
        this.inDB = new AudioFile();

        this.inDB.size = data.size;
        this.inDB.large = (data.size / (1024*1024)) >= 25;
        this.inDB.duration = data.duration;
        this.inDB.cost = Math.ceil(this.inDB.duration / 60) * 0.006 * 100;
        this.inDB.extension = path.extname(this.idOrUrl);
        this.inDB.user = user;
        this.inDB.userId = user.chatId;
        await Router.manager.save(this.inDB);
        fs.writeFileSync(path.join(process.cwd(), "voice", this.inDB.id + this.inDB.extension), response.data);
    }

    public async transcribe(user: User) {
        const res = await Router.manager.findOne(AudioFile, {
            where: {
                id: this.idOrUrl,
                userId: user.chatId
            }
        });
        this.inDB = res!;

        let result = "";
        if (this.inDB.large) {
            const asFile = fs.readFileSync(path.join(process.cwd(), "voice", this.inDB.id + this.inDB.extension));
            const buffers: Buffer[] = await audioToSlice(asFile, 10 * 60, false);
            for (const buffer of buffers) {
                const name = "buf-" + v4() + this.inDB.extension;
                const p = path.join(process.cwd(), "voice", name)
                fs.writeFileSync(p, buffer);
                const res = await openai.audio.transcriptions.create({
                    file: fs.createReadStream(p),
                    model: 'whisper-1'
                });

                result += res.text;
                fs.rmSync(p);
            }

            fs.rmSync(path.join(process.cwd(), "vocie", this.inDB.id + this.inDB.extension));
            await Router.manager.delete(AudioFile, this.inDB.id);
        } else {
            let r = await openai.audio.transcriptions.create({
                file: fs.createReadStream(path.join(process.cwd(), "voice", this.inDB.id + this.inDB.extension)),
                model: 'whisper-1'
            });
            result = r.text;
            fs.rmSync(path.join(process.cwd(), "voice", this.inDB.id + this.inDB.extension));
            await Router.manager.delete(AudioFile, this.inDB.id);
        }

        return result;
    }

    public getCost(): number {
        return Math.round(this.inDB.cost / 0.00034);
    }


    public static async deleteAll(user: User) {
        const audios = await Router.manager.find(AudioFile, {
            where: {
                userId: user.chatId
            }
        });

        for (const audio of audios) {
            fs.rmSync(path.join(process.cwd(), "voice", audio.id + audio.extension));
            await Router.manager.delete(AudioFile, audio.id);
        }
    }

}
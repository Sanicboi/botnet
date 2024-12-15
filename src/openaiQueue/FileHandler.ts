import axios from "axios";
import { INeuroRunJob, openai } from ".";
import path from "path";
import { v4 } from "uuid";
import mime from "mime-types";
import { FileUpload } from "../entity/assistants/FileUpload";
import { AppDataSource } from "../data-source";

export class FileHandler {
  private static async fetchAndUploadFile(
    url: string,
    purpose: "vision" | "assistants",
    userId: string,
  ): Promise<string> {
    const asFile = await this.getFileContent(url);

    const r = await openai.files.create({
      file: asFile,
      purpose,
    });

    const upload = new FileUpload();
    upload.id = r.id;
    upload.userId = userId;
    await AppDataSource.manager.save(upload);

    return upload.id;
  }

  public static async uploadDocuments(j: INeuroRunJob): Promise<string[]> {
    let files: string[] = [];
    if (j.message.files) {
      for (const f of j.message.files) {
        const r = await this.fetchAndUploadFile(f, "assistants", j.userId);
        files.push(r);
      }
    }
    return files;
  }

  public static async deleteFiles(userId: string) {
    let files = await AppDataSource.manager.find(FileUpload, {
      where: {
        userId: userId,
      },
    });

    for (const f of files) {
      await openai.files.del(f.id);
      await AppDataSource.manager.delete(FileUpload, f);
    }
  }

  public static async getFileContent(url: string): Promise<File> {
    const r = await axios.get(url, {
      responseType: "arraybuffer",
    });

    let extension = path.extname(url);
    console.log(r.data);
    return new File(r.data, v4() + extension, {
      type: mime.lookup(extension) || "text/plain",
    });
  }
}

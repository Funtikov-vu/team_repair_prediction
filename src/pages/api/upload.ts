// @ts-nocheck
import { Request, Response } from 'express';
import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';

// first we need to disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  }
};

export default async (req: Request, res: Response) => {
  if (req.method === 'POST') {

    // parse form with a Promise wrapper
    const data: any = await new Promise((resolve, reject) => {
      const form = new IncomingForm();
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    try {
      const file = data.files.file;
      const filePath = file.filepath;
      const pathToWriteImage = `public/jhg`; // include name and .extention, you can get the name from data.files.image object
      const image = await fs.readFile(filePath);
      await fs.writeFile(pathToWriteImage, image);
      //store path in DB
      res.status(200).json({ message: 'image uploaded!' });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
      return;
    }
  };
};
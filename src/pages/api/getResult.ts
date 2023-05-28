import axios from 'axios';
import { Request, Response } from 'express';
import { IncomingForm } from 'formidable';
import { promises as fs } from 'fs';

// first we need to disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  }
};

import stream from 'stream';
import { promisify } from 'util';
import fetch from 'node-fetch';

const pipeline = promisify(stream.pipeline);
const url = 'http://127.0.0.1:8000/result/sdfksjdhfkjsdhfvfvf';

const handler = async (req, res) => {
  const response = await fetch(url); 
  if (!response.ok) throw new Error(`unexpected response ${response.statusText}`);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=results.csv');
  await pipeline(response.body, res);
};

export default handler;

// export default async (req: Request, res: Response) => {
//   await axios.get('http://127.0.0.1:8000/result/sdfksjdhfkjsdhfvfvf', {
//     headers: {
//       'Content-Type': 'text/csv',
//     },
//   }).then((response) => {
//     console.log(response.data);
//     return res.status(200).json({ message: 'success' });
//   }
//   ).catch((error) => {
//     console.log(error);
//     return res.status(500).json({ message: error.message });
//   }
//   );
// };

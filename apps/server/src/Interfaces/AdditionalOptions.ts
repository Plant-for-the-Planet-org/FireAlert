import type {NextApiRequest, NextApiResponse} from 'next';

export interface AdditionalOptions {
  req?: NextApiRequest;
  res?: NextApiResponse;
}

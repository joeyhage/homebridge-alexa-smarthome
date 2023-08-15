import { InitOptions } from 'alexa-remote2';

export type AmazonDomain =
  | 'amazon.com'
  | 'amazon.ca'
  | 'amazon.de'
  | 'amazon.es'
  | 'amazon.fr'
  | 'amazon.it'
  | 'amazon.co.jp'
  | 'amazon.co.uk'
  | 'amazon.com.au'
  | 'amazon.com.br'
  | 'amazon.com.mx';

type FormerRegistrationData = Extract<Extract<InitOptions, Partial<object>>['formerRegistrationData'], object>;
export type Authentication = FormerRegistrationData;

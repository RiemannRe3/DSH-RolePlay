declare module "zod" {
  const z: any;
  export default z;
}

declare module "@deepseek-ai/dsh-storage-domain" {
  export function defineDomain(spec: any): any;
  export function domainTable(schema: any): any;
}

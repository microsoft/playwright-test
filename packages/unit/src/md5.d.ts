declare module 'md5.js' {
  class MD5 {
    update(data: string): MD5;
    digest(): Buffer;
    digest(encoding: string): string; 
  }
  export = MD5;
}

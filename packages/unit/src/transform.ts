import { transformFileAsync } from "@babel/core";
import { requireResolve } from "./requireResolve";

export async function transformLocalFile(filePath: string) : Promise<string>{
  const resolvedPath = await requireResolve(filePath);
  const result = await transformFileAsync(resolvedPath, {
    cwd: __dirname,
    plugins: [
      ['@babel/plugin-transform-typescript', {isTSX: true}],
      ['@babel/plugin-transform-react-jsx'],
      ['babel-plugin-third-party-imports'],
    ]
  });
  if (!result || !result.code)
    throw new Error(`could not transform ${filePath}`);
  return result.code;
}

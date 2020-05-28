import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

import * as deref from '@apidevtools/json-schema-ref-parser';
import * as mergeSchemas from 'json-schema-merge-allof';
import { compile } from 'json-schema-to-typescript';
import { JSONSchema4 } from 'json-schema';

const root = path.resolve(path.join(__dirname, '..'));
const typeFilePath = path.join(root, 'index.d.ts');
const schemaFilesPath = path.join(root, '**/*.schema.json');

const clearFile = async () => {
  fs.writeFileSync(typeFilePath, '', 'utf8');
};

async function run() {
  const files = await new Promise<string[]>((resolve, reject) => {
    glob(schemaFilesPath, async (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(files);
      }
    });
  });

  if (files.length === 0) {
    throw new Error(`Did not find any files in ${schemaFilesPath}`);
  }
  clearFile();

  for (const file of files) {
    const derefedSchema = await deref.dereference(file);
    const schema = mergeSchemas(derefedSchema, {
      ignoreAdditionalProperties: true,
    });
    if (!schema.title) continue;
    if (schema.type === 'object') {
      schema.additionalProperties = false;
    }
    const outputType = await compile(schema as JSONSchema4, schema.title, {
      bannerComment: '',
      strictIndexSignatures: true,
      declareExternallyReferenced: false,
    });
    fs.appendFileSync(typeFilePath, outputType);
    fs.appendFileSync(typeFilePath, '\n');
  }
}

run().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('generate-types error');
  console.error(error);
  process.exit(1);
});
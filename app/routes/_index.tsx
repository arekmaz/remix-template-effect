import { FileSystem, HttpServerRequest } from '@effect/platform';
import { NodeFileSystem } from '@effect/platform-node';
import type { MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Effect } from 'effect';
import { makeLoader } from 'remix-effect';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Schema } from '@effect/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const meta: MetaFunction = () => {
  return [
    { title: 'New Remix App' },
    { name: 'description', content: 'Welcome to Remix!' },
  ];
};

export const loader = makeLoader(
  Effect.gen(function* () {
    yield* Effect.logDebug('init / loader');

    const fileSystem = yield* FileSystem.FileSystem;

    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const content = yield* fileSystem
        .readFileString(__dirname + '/../../package.json')
        .pipe(
          Effect.flatMap(Schema.decode(Schema.parseJson(Schema.Object))),
          Effect.orDie
        );

      return { url: request.url, content };
    });
  }).pipe(Effect.provide(NodeFileSystem.layer))
);

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="font-sans p-4">
      <h1 className="text-3xl">Welcome to Remix Effect</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

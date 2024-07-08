import {
  HttpClientRequest,
  HttpClientResponse,
  HttpServerRequest,
} from '@effect/platform';
import { Schema } from '@effect/schema';
import type { MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Effect } from 'effect';
import { makeLoader, RemixArgs } from '~/remix-effect';

export const meta: MetaFunction = () => {
  return [
    { title: 'New Remix App' },
    { name: 'description', content: 'Welcome to Remix!' },
  ];
};

const downloadPerson = (id: string) =>
  HttpClientRequest.get('https://swapi.dev/api/people/' + id).pipe(
    Effect.flatMap(
      HttpClientResponse.schemaBodyJson(
        Schema.Struct({ name: Schema.NonEmpty })
      )
    ),
    Effect.withSpan('downloadPerson'),
    Effect.annotateSpans('person-id', id)
  );

export const loader = makeLoader(
  Effect.gen(function* () {
    yield* Effect.logDebug('init / loader');

    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest.pipe(
        Effect.withSpan('read http request')
      );

      const people = yield* Effect.forEach(
        Array.from({ length: 16 }, (_, i) => i + 1),
        (id) => downloadPerson(String(id)).pipe(Effect.timeout('2 second')),
        { concurrency: 'unbounded' }
      ).pipe(Effect.orDie);

      return {
        url: request.url,
        people,
        reqId: yield* RemixArgs.requestId.pipe(Effect.withSpan('read req id')),
      };
    }).pipe(
      Effect.withSpan('c'),
      Effect.withSpan('b'),
      Effect.withSpan('a'),
      Effect.annotateSpans('working', true)
    );
  })
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

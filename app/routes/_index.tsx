import {
  HttpClientRequest,
  HttpClientResponse,
  HttpServerRequest,
} from '@effect/platform';
import { Schema } from '@effect/schema';
import type { MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Array, Effect } from 'effect';
import { makeLoader, RemixArgs } from '~/remix-effect';

export const meta: MetaFunction = () => {
  return [
    { title: 'New Remix App' },
    { name: 'description', content: 'Welcome to Remix!' },
  ];
};

const downloadPeople = Effect.gen(function* () {
  const responseSchema = Schema.Struct({
    next: Schema.NullOr(Schema.NonEmpty),
    results: Schema.NonEmptyArray(Schema.Struct({ url: Schema.NonEmpty })),
  });

  const download = (url: string) =>
    HttpClientRequest.get(url, {}).pipe(
      Effect.flatMap(HttpClientResponse.schemaBodyJson(responseSchema))
    );

  const load = (url: string): ReturnType<typeof download> =>
    Effect.gen(function* () {
      const first = yield* download(url);

      if (first.next) {
        return yield* load(first.next).pipe(
          Effect.map((r) => ({
            results: [...first.results, ...r.results] as const,
            next: r.next,
          }))
        );
      }

      return first;
    });

  return yield* load('https://swapi.dev/api/people');
}).pipe(Effect.withSpan('downloadPeople'));

const downloadPersonByUrl = (url: string) =>
  HttpClientRequest.get(url).pipe(
    Effect.flatMap(
      HttpClientResponse.schemaBodyJson(
        Schema.Struct({ name: Schema.NonEmpty })
      )
    ),
    Effect.withSpan('downloadPerson')
  );

export const loader = makeLoader(
  Effect.gen(function* () {
    yield* Effect.logDebug('init / loader');

    const cachedDownloadPeople = yield* Effect.cachedWithTTL(
      downloadPeople,
      '2 hours'
    );

    const cachedLoadFreshPeople = yield* Effect.cachedWithTTL(
      cachedDownloadPeople.pipe(
        Effect.flatMap(({ results }) =>
          Effect.allSuccesses(
            results.map(({ url }) => downloadPersonByUrl(url)),
            { concurrency: 'unbounded' }
          )
        ),
        Effect.map(Array.map(({ name }) => name))
      ),
      '20 seconds'
    );

    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest.pipe(
        Effect.withSpan('read http request')
      );

      const people = yield* cachedLoadFreshPeople.pipe(
        Effect.withSpan('process people for request')
      );

      yield* Effect.logError('log test');

      return {
        url: request.url,
        reqId: yield* RemixArgs.requestId.pipe(Effect.withSpan('read req id')),
        totalPeople: people.length,
        people,
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

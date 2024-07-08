import { HttpServerRequest } from '@effect/platform';
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

const task = (
  name: string,
  delay: number,
  children: ReadonlyArray<Effect.Effect<void>> = []
) =>
  Effect.gen(function* () {
    yield* Effect.log(name);
    yield* Effect.sleep(`${delay} millis`);
    for (const child of children) {
      yield* child;
    }
    yield* Effect.sleep(`${delay} millis`);
  }).pipe(Effect.withSpan(name));

const poll = task('/poll', 1);

const program = task('client', 2, [
  task('/api', 3, [
    task('/authN', 4, [task('/authZ', 5)]),
    task('/payment Gateway', 6, [task('DB', 7), task('Ext. Merchant', 8)]),
    task('/dispatch', 9, [
      task('/dispatch/search', 10),
      Effect.all([poll, poll, poll], { concurrency: 'inherit' }),
      task('/pollDriver/{id}', 11),
    ]),
  ]),
]);

export const loader = makeLoader(
  Effect.gen(function* () {
    yield* Effect.logDebug('init / loader');

    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;

      yield* program;

      return { url: request.url, reqId: yield* RemixArgs.requestId };
    });
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

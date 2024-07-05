import { HttpClient, HttpServerRequest } from '@effect/platform';
import { LoaderFunctionArgs } from '@remix-run/node';
import { Effect, Layer, ManagedRuntime } from 'effect';

type AppContext = {
  getRequestId: () => string;
};

export class RemixArgs extends Effect.Tag('@app/services/RemixArgs')<
  RemixArgs,
  Omit<LoaderFunctionArgs, 'context'> & {
    ctx: AppContext;
    requestId: Effect.Effect<string, never, never>;
  }
>() {}

export const makeRemixRuntime = <R>(layer: Layer.Layer<R, never, never>) => {
  const runtime = ManagedRuntime.make(layer);

  const dataFunctionFromEffect = <A, E>(
    body: Effect.Effect<
      Effect.Effect<A, E, R | RemixArgs | HttpServerRequest.HttpServerRequest>,
      never,
      R
    >
  ) => {
    const makeLoaderPromise = runtime.runPromise(body);

    return ({ context, ...args }: LoaderFunctionArgs) => {
      const ctx = context as AppContext;

      return makeLoaderPromise.then((effect) =>
        runtime.runPromise(
          effect.pipe(
            Effect.provideService(
              RemixArgs,
              RemixArgs.of({
                ...args,
                ctx,
                requestId: Effect.sync(ctx.getRequestId),
              })
            ),
            Effect.provideService(
              HttpServerRequest.HttpServerRequest,
              HttpServerRequest.HttpServerRequest.of(
                HttpServerRequest.fromWeb(args.request)
              )
            )
          )
        )
      );
    };
  };

  return {
    makeLoader: dataFunctionFromEffect,
    makeAction: dataFunctionFromEffect,
    runtime,
  };
};

export const { makeAction, makeLoader, runtime } = makeRemixRuntime(
  HttpClient.layer
);

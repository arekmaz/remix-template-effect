import { HttpClient, HttpServerRequest } from '@effect/platform';
import { LoaderFunctionArgs } from '@remix-run/node';
import { Effect, Layer, ManagedRuntime, Scope } from 'effect';
import { NodeSdk } from '@effect/opentelemetry';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import pckg from '../package.json';

type AppContext = {
  getRequestId: () => string;
};

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: { serviceName: pckg.name },
  spanProcessor: new BatchSpanProcessor(new OTLPTraceExporter()),
}));

export class RemixArgs extends Effect.Tag('@app/services/RemixArgs')<
  RemixArgs,
  Omit<LoaderFunctionArgs, 'context'> & {
    ctx: AppContext;
    requestId: string;
  }
>() { }

export const makeRemixRuntime = <R>(layer: Layer.Layer<R, never, never>) => {
  const runtime = ManagedRuntime.make(layer);

  const dataFunctionFromEffect = <A, E>(
    body: Effect.Effect<
      Effect.Effect<
        A,
        E,
        R | RemixArgs | HttpServerRequest.HttpServerRequest | Scope.Scope
      >,
      never,
      R
    >
  ) => {
    const makeLoaderPromise = runtime.runPromise(body);

    return async ({ context, ...args }: LoaderFunctionArgs) => {
      const ctx = context as AppContext;

      const requestId = ctx.getRequestId();

      const effect = await makeLoaderPromise;

      return runtime.runPromise(
        effect.pipe(
          Effect.provideService(
            RemixArgs,
            RemixArgs.of({
              ...args,
              ctx,
              requestId,
            })
          ),
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.HttpServerRequest.of(
              HttpServerRequest.fromWeb(args.request)
            )
          ),
          Effect.scoped,
          Effect.withSpan('data-fn-handler'),
          Effect.annotateSpans('req-id', requestId)
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
  HttpClient.layer.pipe(Layer.provideMerge(NodeSdkLive))
);

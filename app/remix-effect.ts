import { NodeSdk } from '@effect/opentelemetry';
import { HttpClient, HttpServerRequest } from '@effect/platform';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { LoaderFunctionArgs } from '@remix-run/node';
import { Effect, Layer, ManagedRuntime, Scope } from 'effect';
import pckg from '../package.json';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

type AppContext = {
  getRequestId: () => string;
};

const NodeSdkLive = NodeSdk.layer(() => ({
  resource: {
    serviceName: pckg.name,
  },
  // spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({
      url: 'http://localhost:4318/v1/traces',
    })
  ),
  metricReader: new PrometheusExporter({ port: 9090 }),
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
  const runtimeScope = Effect.runSync(Scope.make());

  const dataFunctionFromEffect = <A, E>(
    body: Effect.Effect<
      Effect.Effect<
        A,
        E,
        R | RemixArgs | HttpServerRequest.HttpServerRequest | Scope.Scope
      >,
      never,
      R | Scope.Scope
    >
  ) => {
    const makeLoaderPromise = runtime.runPromise(
      body.pipe(Effect.provideService(Scope.Scope, runtimeScope))
    );

    return ({ context, ...args }: LoaderFunctionArgs) => {
      const ctx = context as AppContext;

      return makeLoaderPromise.then((effect) => {
        const requestId = ctx.getRequestId();

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
            Effect.withSpan('data-fn-body'),
            Effect.annotateSpans('req-id', requestId),
            Effect.scoped
          )
        );
      });
    };
  };

  return {
    makeLoader: dataFunctionFromEffect,
    makeAction: dataFunctionFromEffect,
    runtime,
  };
};

export const { makeAction, makeLoader, runtime } = makeRemixRuntime(
  HttpClient.layer.pipe(Layer.merge(NodeSdkLive))
);

# Remix - Effect template

## Project generated from `https://github.com/arekmaz/remix-template-effect`.

## To scaffold a project named `remix-test`, simply run

```bash
npx create-remix remix-test --template https://github.com/arekmaz/remix-template-effect
```

## Credits:

- https://github.com/mikearnaldi
- https://github.com/datner

## Local telemetry docker setup:

Ensure docker is installed, then from the project folder, run:

```bash
cd docker; docker compose up -d
```

Go to the grafana dashboard at `http://localhost:4445/explore`, you should see tracing data from you local server.

More info: https://effect.website/docs/guides/observability/telemetry/tracing

- 📖 [Remix docs](https://remix.run/docs)

## Development

Run the dev server:

```shellscript
npm run dev
```

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.

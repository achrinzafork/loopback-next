---
lang: en
title: 'Migrate from Legacy Sequence'
keywords:
  LoopBack 4.0, LoopBack 4, Node.js, TypeScript, OpenAPI, Migrate Legacy
  Sequence
sidebar: lb4_sidebar
permalink: /doc/en/lb4/Migrate-from-legacy-sequence.html
---

The `Sequence` generated before `@loopback/rest@6.0.0` comes with hard-coded
actions as follows:

```ts
import {inject} from '@loopback/core';
import {
  FindRoute,
  InvokeMethod,
  InvokeMiddleware,
  ParseParams,
  Reject,
  RequestContext,
  RestBindings,
  Send,
  SequenceHandler,
} from '@loopback/rest';

const SequenceActions = RestBindings.SequenceActions;

export class MySequence implements SequenceHandler {
  /**
   * Optional invoker for registered middleware in a chain.
   * To be injected via SequenceActions.INVOKE_MIDDLEWARE.
   */
  @inject(SequenceActions.INVOKE_MIDDLEWARE, {optional: true})
  protected invokeMiddleware: InvokeMiddleware = () => false;

  constructor(
    @inject(SequenceActions.FIND_ROUTE) protected findRoute: FindRoute,
    @inject(SequenceActions.PARSE_PARAMS) protected parseParams: ParseParams,
    @inject(SequenceActions.INVOKE_METHOD) protected invoke: InvokeMethod,
    @inject(SequenceActions.SEND) public send: Send,
    @inject(SequenceActions.REJECT) public reject: Reject,
  ) {}

  async handle(context: RequestContext) {
    try {
      const {request, response} = context;
      const finished = await this.invokeMiddleware(context);
      if (finished) return;
      const route = this.findRoute(request);
      const args = await this.parseParams(request, route);
      const result = await this.invoke(route, args);
      this.send(response, result);
    } catch (err) {
      this.reject(context, err);
    }
  }
}
```

The legacy `Sequence` is now deprecated but it should continue to work without
any changes.

If you have never customized `src/sequence.ts` generated by `lb4 app`, or you
have only modified the code by adding
[`authenticate`](Authentication-component-action.md) action per our docs, you
can simply migrate to the middleware based sequence by replacing the content of
`src/sequence.ts` with the code below.

```ts
import {MiddlewareSequence} from '@loopback/rest';

export class MySequence extends MiddlewareSequence {}
```

If you have other actions in your sequence, e.g., complex error handling per
end-point, you'll have to write a Middleware to wrap your action and register it
with the middleware chain for the middleware-based sequence.

This can be achieved by creating a Middleware in
`src/middlewares/error-handler.middleware.ts` with the code below:

```ts
import {inject, injectable, Next, Provider} from '@loopback/core';
import {
  asMiddleware,
  HttpErrors,
  LogError,
  Middleware,
  Response,
  MiddlewareContext,
  RestBindings,
  RestMiddlewareGroups,
} from '@loopback/rest';

@injectable(
  asMiddleware({
    group: 'validationError',
    upstreamGroups: RestMiddlewareGroups.SEND_RESPONSE,
    downstreamGroups: RestMiddlewareGroups.CORS,
  }),
)
export class ErrorHandlerMiddlewareProvider implements Provider<Middleware> {
  constructor(
    @inject(RestBindings.SequenceActions.LOG_ERROR)
    protected logError: LogError,
  ) {}

  async value() {
    const middleware: Middleware = async (
      ctx: MiddlewareContext,
      next: Next,
    ) => {
      try {
        return await next();
      } catch (err) {
        // Any error handling goes here
        return this.handleError(ctx, err);
      }
    };
    return middleware;
  }

  handleError(context: MiddlewareContext, err: HttpErrors.HttpError): Response {
    // We simply log the error although more complex scenarios can be performed
    // such as customizing errors for a specific endpoint
    this.logError(err, err.statusCode, context.request);
    throw err;
  }
}
```

then bond to the application `src/application.ts` by:

```ts
import {ErrorHandlerMiddlewareProvider} from './middlewares';

//...
 constructor(options: ApplicationConfig = {}) {
   ...
  this.add(createBindingFromClass(ErrorHandlerMiddlewareProvider));
}
// ...
```

As part of the legacy action-based sequence, the `invoke` function takes `route`
and `args` as input parameters and returns `result`.

```ts
const route = this.findRoute(request);
const args = await this.parseParams(request, route);
const result = await this.invoke(route, args);
this.send(response, result);
```

The corresponding middleware for `invokeMethod` looks like the following. It now
uses the `context` to retrieve `route` and `params` instead. The return value is
also bound to `RestBindings.Operation.RETURN_VALUE` to expose to other
middleware in the chain, as illustrated below.

```ts
...
export class ErrorHandlerMiddlewareProvider implements Provider<Middleware> {
  ...
  async value() {
    const middleware: Middleware = async (
            ctx: MiddlewareContext,
            next: Next,
    ) => {
      try {
        // Locate or inject input parameters from the request context
        const route: RouteEntry = await ctx.get(RestBindings.Operation.ROUTE);
        const params: OperationArgs = await ctx.get(RestBindings.Operation.PARAMS);
        const retVal = await this.invokeMethod(route, params);
        // Bind the return value to the request context
        ctx.bind(RestBindings.Operation.RETURN_VALUE).to(retVal);
        return await next();
      } catch (err) {
        // Any error handling goes here
        ....
      }
    };
    return middleware;
  }
  ....
}
```

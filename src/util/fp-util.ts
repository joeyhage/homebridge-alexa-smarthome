import * as E from 'fp-ts/Either';
import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
import { TaskEither } from 'fp-ts/TaskEither';
import { LazyArg, pipe } from 'fp-ts/lib/function';
import { Nullable } from '../domain';

export const getOrElse = <T>(opt: Option<T>, onNone: LazyArg<T>): T =>
  pipe(opt, O.getOrElse(onNone));

export const getOrElseNullable = <T>(
  nullable: Nullable<T>,
  onNone: LazyArg<T>,
): T => pipe(nullable, O.fromNullable, O.getOrElse(onNone));

export const matchNullable = <A, B>(
  nullable: Nullable<A>,
  onNone: LazyArg<B>,
  onSome: (some: A) => B,
): B => pipe(nullable, O.fromNullable, O.match(onNone, onSome));

/**
 * Retries a TaskEither on failure with a fixed delay between attempts.
 * Amazon's own Alexa app/website routinely needs a couple of tries before a
 * command reaches a device that's mid-reconnect - a single fire-and-forget
 * attempt (this plugin's prior behavior) gives up on exactly the cases a
 * human retrying in the app would eventually succeed at. `shouldRetry`
 * scopes retries to specifically transient failures (e.g. DeviceOffline)
 * rather than masking genuine errors like invalid input.
 */
export const withRetry = <Err, A>(
  task: TaskEither<Err, A>,
  options: {
    retries: number;
    delayMs: number;
    shouldRetry?: (e: Err) => boolean;
  },
): TaskEither<Err, A> => {
  const { retries, delayMs, shouldRetry = () => true } = options;
  return async () => {
    let result = await task();
    let attempts = 0;
    while (E.isLeft(result) && attempts < retries && shouldRetry(result.left)) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      result = await task();
      attempts++;
    }
    return result;
  };
};

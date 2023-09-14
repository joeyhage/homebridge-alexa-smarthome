import * as O from 'fp-ts/Option';
import { Option } from 'fp-ts/Option';
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

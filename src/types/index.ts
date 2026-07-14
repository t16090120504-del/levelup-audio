/**
 * Barrel file that re-exports all type definitions from their individual
 * modules. This allows importing any type from '@/types' without needing
 * to know which sub-module it lives in.
 *
 * Individual modules:
 * - ./content  — Genre, Series, Episode, PaginatedResult, etc.
 * - ./coin     — CoinPack, CoinTransaction, SubscriptionPlan, etc.
 * - ./user     — User, ListeningProgress, UserSubscription, etc.
 * - ./player   — PlayerState, PlayerQueue
 */

export * from './content';
export * from './coin';
export * from './user';
export * from './player';

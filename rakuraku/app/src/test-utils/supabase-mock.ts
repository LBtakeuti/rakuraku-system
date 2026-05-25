import { vi } from "vitest";

/**
 * Supabase の query builder をテスト用に再現する軽量モック。
 *
 * 使い方:
 *   const sb = createSupabaseMock({
 *     // table 名をキーに、その table への呼び出しに対するレスポンスを設定する
 *     customer: { data: [{ name: "x" }] },
 *     // 同じ table に対する複数回の呼び出しは配列で渡す（先頭から順に消費）
 *     sales_order: [
 *       { data: { id: "so-1" } },          // 1回目
 *       { data: [{ ... }] },               // 2回目
 *     ],
 *     // 挿入専用にしたいときは insert を分けても良い
 *   });
 *   mockedCreate.mockResolvedValue(sb as never);
 *
 * 連鎖メソッド（select / order / limit / eq / in / gte / lte / like / or /
 * range / single / maybeSingle）はすべて同じ chain を返す。
 * 終端は `await chain` で `{ data, error, count }` を返す（thenable）。
 */
export type MockResponse<T = unknown> = {
  data?: T;
  error?: { message: string } | null;
  count?: number | null;
};

type TableQueue = MockResponse | MockResponse[];

export function createSupabaseMock(tables: Record<string, TableQueue> = {}) {
  const queues = new Map<string, MockResponse[]>();
  for (const [k, v] of Object.entries(tables)) {
    queues.set(k, Array.isArray(v) ? [...v] : [v]);
  }

  const fromCalls: { table: string }[] = [];
  const insertCalls: { table: string; payload: unknown }[] = [];
  const updateCalls: { table: string; payload: unknown }[] = [];
  const deleteCalls: { table: string }[] = [];

  function from(table: string) {
    fromCalls.push({ table });

    const consume = (): MockResponse => {
      const queue = queues.get(table);
      if (!queue || queue.length === 0) {
        return { data: null, error: null, count: 0 };
      }
      // 最後の要素はずっと使い回す（在庫的なフォールバック）。
      return queue.length === 1 ? queue[0] : (queue.shift() as MockResponse);
    };

    const chain: Record<string, unknown> = {};
    const passthrough = () => chain;

    chain.select = vi.fn(passthrough);
    chain.insert = vi.fn((payload: unknown) => {
      insertCalls.push({ table, payload });
      return chain;
    });
    chain.update = vi.fn((payload: unknown) => {
      updateCalls.push({ table, payload });
      return chain;
    });
    chain.delete = vi.fn(() => {
      deleteCalls.push({ table });
      return chain;
    });
    chain.upsert = vi.fn(passthrough);
    chain.eq = vi.fn(passthrough);
    chain.in = vi.fn(passthrough);
    chain.gte = vi.fn(passthrough);
    chain.lte = vi.fn(passthrough);
    chain.gt = vi.fn(passthrough);
    chain.lt = vi.fn(passthrough);
    chain.like = vi.fn(passthrough);
    chain.ilike = vi.fn(passthrough);
    chain.or = vi.fn(passthrough);
    chain.is = vi.fn(passthrough);
    chain.order = vi.fn(passthrough);
    chain.range = vi.fn(() => {
      const r = consume();
      return Promise.resolve({
        data: r.data ?? null,
        error: r.error ?? null,
        count: r.count ?? null,
      });
    });
    chain.limit = vi.fn(() => {
      const r = consume();
      return Promise.resolve({
        data: r.data ?? null,
        error: r.error ?? null,
        count: r.count ?? null,
      });
    });
    chain.single = vi.fn(() => {
      const r = consume();
      const data = Array.isArray(r.data) ? r.data[0] : r.data;
      return Promise.resolve({
        data: data ?? null,
        error: r.error ?? null,
      });
    });
    chain.maybeSingle = vi.fn(() => {
      const r = consume();
      const data = Array.isArray(r.data) ? r.data[0] : r.data;
      return Promise.resolve({
        data: data ?? null,
        error: r.error ?? null,
      });
    });
    // `.order()` 等で chain を終端にして `await chain` するパターン（例: findFifoLots）
    // のために thenable も実装する。`.limit()` や `.single()` などで明示的に Promise
    // を取り出した場合はそちらが消費するため、`then` は呼ばれない。
    chain.then = (
      resolve: (v: unknown) => unknown,
      reject?: (e: unknown) => unknown
    ) => {
      const r = consume();
      return Promise.resolve({
        data: r.data ?? null,
        error: r.error ?? null,
        count: r.count ?? null,
      }).then(resolve, reject);
    };
    return chain;
  }

  return {
    from,
    // テスト側で参照できる呼び出し履歴
    _calls: {
      from: fromCalls,
      insert: insertCalls,
      update: updateCalls,
      delete: deleteCalls,
    },
  };
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;

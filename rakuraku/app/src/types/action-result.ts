export type ActionResult<T = void> =
  | ({ success: true } & (T extends void ? object : { data: T }))
  | {
      success: false;
      fieldErrors?: Record<string, string[] | undefined>;
      formError?: string;
    };

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataTable, type DataColumn } from "../data-table";

type Row = { id: string; name: string; amount: number };

const sampleRows: Row[] = [
  { id: "a", name: "Alpha", amount: 100 },
  { id: "b", name: "Beta", amount: 200 },
];

const columns: DataColumn<Row>[] = [
  { key: "id", header: "ID", cell: (r) => r.id },
  { key: "name", header: "Name", cell: (r) => r.name },
  { key: "amount", header: "Amount", align: "right", cell: (r) => r.amount },
];

describe("DataTable", () => {
  const baseProps = {
    rows: sampleRows,
    total: 2,
    columns,
    rowKey: (r: Row) => r.id,
    unitLabel: "件",
    page: 1,
    pageSize: 20,
    onPageChange: vi.fn(),
  };

  it("件数表示とヘッダ・各行を描画する", () => {
    render(<DataTable {...baseProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("件")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
  });

  it("rows が空のときに emptyMessage を表示する（既定）", () => {
    render(<DataTable {...baseProps} rows={[]} total={0} />);
    expect(
      screen.getByText("データが見つかりませんでした")
    ).toBeInTheDocument();
  });

  it("emptyMessage を上書きできる", () => {
    render(
      <DataTable
        {...baseProps}
        rows={[]}
        total={0}
        emptyMessage="カスタム空文言"
      />
    );
    expect(screen.getByText("カスタム空文言")).toBeInTheDocument();
  });

  it("onRowClick を渡すと行クリックで該当 row が引数になる", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    render(<DataTable {...baseProps} onRowClick={onRowClick} />);
    await user.click(screen.getByText("Alpha"));
    expect(onRowClick).toHaveBeenCalledWith(sampleRows[0]);
  });

  it("trailing 列がクリック時に親 onRowClick まで伝播しない", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const trailingClick = vi.fn();
    render(
      <DataTable
        {...baseProps}
        onRowClick={onRowClick}
        trailing={(r) => (
          <button type="button" onClick={trailingClick} aria-label={`a-${r.id}`}>
            アクション
          </button>
        )}
      />
    );
    await user.click(screen.getByRole("button", { name: "a-a" }));
    expect(trailingClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("ページネーション：1ページに収まる時は前へ/次へが描画されない", () => {
    render(<DataTable {...baseProps} total={10} pageSize={20} />);
    expect(screen.queryByRole("button", { name: "前へ" })).toBeNull();
    expect(screen.queryByRole("button", { name: "次へ" })).toBeNull();
  });

  it("総ページ数 > 1 のとき表示され、onPageChange が呼ばれる", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <DataTable
        {...baseProps}
        total={50}
        page={2}
        pageSize={20}
        onPageChange={onPageChange}
      />
    );
    expect(screen.getByText("2 / 3 ページ")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "前へ" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole("button", { name: "次へ" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("先頭ページで『前へ』disabled、最終ページで『次へ』disabled", () => {
    const { rerender } = render(
      <DataTable {...baseProps} total={50} page={1} pageSize={20} />
    );
    expect(screen.getByRole("button", { name: "前へ" })).toBeDisabled();
    rerender(<DataTable {...baseProps} total={50} page={3} pageSize={20} />);
    expect(screen.getByRole("button", { name: "次へ" })).toBeDisabled();
  });
});

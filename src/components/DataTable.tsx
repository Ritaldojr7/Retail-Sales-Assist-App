import React, { useState } from "react";
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { IconButton } from "./Buttons";

export interface Column<T> {
  header: React.ReactNode;
  accessor: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKey?: (item: T) => string;
  toolbarActions?: React.ReactNode;
  itemsPerPage?: number;
  emptyMessage?: string;
}

export default function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Search...",
  searchKey,
  toolbarActions,
  itemsPerPage = 10,
  emptyMessage = "No entries found.",
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Search filter
  const filteredData = searchKey && searchTerm
    ? data.filter((item) => searchKey(item).toLowerCase().includes(searchTerm.toLowerCase()))
    : data;

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col items-stretch justify-between gap-4 bg-bg-secondary p-4 rounded-sm border border-border">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-tertiary" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-10 pl-10 pr-4 bg-bg-primary border border-border rounded-sm fs-small text-text-primary focus-ring"
          />
        </div>
        <div className="flex items-center gap-3 justify-end">
          {toolbarActions}
        </div>
      </div>

      {/* Table grid container */}
      <div className="overflow-x-auto rounded-sm border border-border bg-bg-secondary">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-bg-tertiary">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`px-4 py-3 fs-small font-semibold text-text-secondary tracking-wide sticky top-0 ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {paginatedData.length > 0 ? (
              paginatedData.map((item, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-bg-tertiary/40 transition-120 group fs-body text-text-primary"
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`px-4 py-3.5 align-middle ${col.className || ""}`}>
                      {col.accessor(item)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-text-tertiary fs-body">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary rounded-sm border border-border">
          <div className="fs-small text-text-secondary">
            Showing <span className="font-semibold text-text-primary">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
            <span className="font-semibold text-text-primary">
              {Math.min(currentPage * itemsPerPage, filteredData.length)}
            </span>{" "}
            of <span className="font-semibold text-text-primary">{filteredData.length}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <IconButton
              icon={<ChevronLeft className="w-4.5 h-4.5" />}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            />
            <span className="fs-small font-medium px-2 text-text-primary">
              Page {currentPage} of {totalPages}
            </span>
            <IconButton
              icon={<ChevronRight className="w-4.5 h-4.5" />}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              aria-label="Next page"
            />
          </div>
        </div>
      )}
    </div>
  );
}

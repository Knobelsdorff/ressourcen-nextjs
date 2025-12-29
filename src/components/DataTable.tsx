"use client";

import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  X,
} from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  pageSize?: number;
  searchable?: boolean;
  exportable?: boolean;
  title?: string;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  pageSize = 10,
  searchable = true,
  exportable = true,
  title,
  emptyMessage = "Keine Daten verfügbar",
  className = "",
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  // Filtering logic
  const filteredData = useMemo(() => {
    let result = [...data];

    // Global search
    if (searchTerm) {
      result = result.filter((row) =>
        columns.some((col) => {
          const value = row[col.key];
          return String(value).toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Column filters
    Object.entries(columnFilters).forEach(([key, filterValue]) => {
      if (filterValue) {
        result = result.filter((row) =>
          String(row[key]).toLowerCase().includes(filterValue.toLowerCase())
        );
      }
    });

    return result;
  }, [data, searchTerm, columnFilters, columns]);

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      if (aValue === bValue) return 0;

      let comparison = 0;
      if (aValue === null || aValue === undefined) comparison = 1;
      else if (bValue === null || bValue === undefined) comparison = -1;
      else if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, sortedData.length);
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm, columnFilters]);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  const handleExport = () => {
    // Export to CSV
    const headers = columns.map((col) => col.label).join(",");
    const rows = sortedData
      .map((row) =>
        columns
          .map((col) => {
            const value = row[col.key];
            // Handle special characters in CSV
            const stringValue = String(value || "");
            return stringValue.includes(",") || stringValue.includes('"')
              ? `"${stringValue.replace(/"/g, '""')}"`
              : stringValue;
          })
          .join(",")
      )
      .join("\n");

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    // Use a more reliable download method
    const link = document.createElement("a");
    link.href = url;
    link.download = `export_${new Date().toISOString().split("T")[0]}.csv`;

    // Trigger download without adding to DOM
    link.click();

    // Clean up
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setColumnFilters({});
    setSortColumn(null);
    setSortDirection("asc");
  };

  const hasActiveFilters =
    searchTerm || Object.values(columnFilters).some((v) => v);

  return (
    <div className={`bg-white rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search */}
            {searchable && (
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>
            )}

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
                showFilters
                  ? "bg-amber-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter
              {hasActiveFilters && (
                <span className="ml-1 px-1.5 py-0.5 bg-amber-700 text-white text-xs rounded-full">
                  !
                </span>
              )}
            </button>

            {/* Export */}
            {exportable && (
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Column Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700">
                Spalten-Filter
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-amber-600 hover:text-amber-700 flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Filter zurücksetzen
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {columns
                .filter((col) => col.filterable !== false)
                .map((col) => (
                  <div key={col.key}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {col.label}
                    </label>
                    <input
                      type="text"
                      placeholder={`${col.label} filtern...`}
                      value={columnFilters[col.key] || ""}
                      onChange={(e) =>
                        setColumnFilters({
                          ...columnFilters,
                          [col.key]: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                    />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <span>
            Zeige {startIndex + 1} - {endIndex} von {sortedData.length}{" "}
            {sortedData.length !== data.length && `(${data.length} gesamt)`}
          </span>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Zeilen pro Seite:</label>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 text-sm font-semibold text-gray-700 ${
                    col.align === "center"
                      ? "text-center"
                      : col.align === "right"
                      ? "text-right"
                      : "text-left"
                  } ${col.sortable !== false ? "cursor-pointer hover:bg-gray-100" : ""}`}
                  style={{ width: col.width }}
                  onClick={() =>
                    col.sortable !== false && handleSort(col.key)
                  }
                >
                  <div className="flex items-center gap-2 justify-between">
                    <span>{col.label}</span>
                    {col.sortable !== false && (
                      <span className="flex-shrink-0">
                        {sortColumn === col.key ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-4 h-4 text-gray-400" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => {
                // Generate a stable key using row data or index
                const rowKey = row.id || `${startIndex}-${rowIndex}`;
                return (
                  <tr
                    key={rowKey}
                    className="border-b hover:bg-amber-50 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={`${rowKey}-${col.key}`}
                        className={`py-3 px-4 text-sm text-gray-700 ${
                          col.align === "center"
                            ? "text-center"
                            : col.align === "right"
                            ? "text-right"
                            : "text-left"
                        }`}
                      >
                        {col.render
                          ? col.render(row[col.key], row, startIndex + rowIndex)
                          : String(row[col.key] || "-")}
                      </td>
                    ))}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-12 px-4 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Page info */}
            <div className="text-sm text-gray-600">
              Seite {currentPage} von {totalPages}
            </div>

            {/* Pagination controls */}
            <div className="flex items-center gap-2">
              {/* First page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Erste Seite"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Previous page */}
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Vorherige Seite"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  if (pageNum < 1 || pageNum > totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        currentPage === pageNum
                          ? "bg-amber-600 text-white"
                          : "border border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next page */}
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Nächste Seite"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Last page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Letzte Seite"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

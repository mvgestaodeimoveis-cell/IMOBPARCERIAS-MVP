'use client';

interface PagerProps {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}

/** Paginação simples (anterior/próxima + indicador). Usada nas listas do admin. */
export function Pager({ page, pageSize, total, onPage }: PagerProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  const inicio = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const fim = Math.min(page * pageSize, total);
  return (
    <div className="pager">
      <button
        className="btn btn-ghost btn-sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ← Anterior
      </button>
      <span className="pager-info">
        {inicio}–{fim} de {total} · pág. {page}/{totalPages}
      </span>
      <button
        className="btn btn-ghost btn-sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Próxima →
      </button>
    </div>
  );
}

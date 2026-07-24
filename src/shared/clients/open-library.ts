// Integração externa isolada: Open Library é usada apenas para sugerir dados
// de preenchimento no cadastro de livro (módulo livro).
export interface OpenLibraryDoc {
  title?: string;
  author_name?: string[];
  publisher?: string[];
  first_publish_year?: number;
  isbn?: string[];
}

export interface OpenLibrarySugestao {
  titulo: string;
  autor: string;
  editora: string;
  anoPublicacao: number | null;
  isbn: string;
}

export async function buscarLivrosExternos(titulo: string): Promise<OpenLibrarySugestao[]> {
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(titulo)}&limit=10`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) throw new Error(`Open Library respondeu ${resp.status}`);

    const data = (await resp.json()) as { docs?: OpenLibraryDoc[] };
    return (data.docs ?? []).slice(0, 10).map((d) => ({
      titulo: d.title ?? '',
      autor: Array.isArray(d.author_name) ? d.author_name.join(', ') : '',
      editora: Array.isArray(d.publisher) ? d.publisher[0] : '',
      anoPublicacao: d.first_publish_year ?? null,
      isbn: Array.isArray(d.isbn) ? d.isbn[0] : '',
    }));
  } finally {
    clearTimeout(timeout);
  }
}

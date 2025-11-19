import { User, Book, Highlight, ProcessingStatus, VectorEmbedding, Illustration, CharacterProfile, IllustrationStyle, Bookmark, Block } from "../types";
import { processPdf } from './pdfService';
import { answerQuestionWithContext, analyzeParagraphForIllustration, generateIllustration, createSummaryAndFlashcard } from './geminiService';

const FAKE_DELAY = 200; // Reduced for snappier feel

// --- Helper Functions ---
const db = {
  users: JSON.parse(localStorage.getItem('readx_users') || '[]'),
  books: JSON.parse(localStorage.getItem('readx_books') || '[]'),
  highlights: JSON.parse(localStorage.getItem('readx_highlights') || '[]'),
  embeddings: JSON.parse(localStorage.getItem('readx_embeddings') || '[]'),
  illustrations: JSON.parse(localStorage.getItem('readx_illustrations') || '[]'),
  character_profiles: JSON.parse(localStorage.getItem('readx_character_profiles') || '[]'),
  bookmarks: JSON.parse(localStorage.getItem('readx_bookmarks') || '[]'),

  save() {
    localStorage.setItem('readx_users', JSON.stringify(this.users));
    localStorage.setItem('readx_books', JSON.stringify(this.books));
    localStorage.setItem('readx_highlights', JSON.stringify(this.highlights));
    localStorage.setItem('readx_embeddings', JSON.stringify(this.embeddings));
    localStorage.setItem('readx_illustrations', JSON.stringify(this.illustrations));
    localStorage.setItem('readx_character_profiles', JSON.stringify(this.character_profiles));
    localStorage.setItem('readx_bookmarks', JSON.stringify(this.bookmarks));
  }
};

const simulateDelay = () => new Promise(resolve => setTimeout(resolve, FAKE_DELAY));

// --- API Service ---
export const api = {
  // --- AUTH ---
  async signup(name: string, email: string, pass: string): Promise<User> {
    await simulateDelay();
    if (db.users.find((u: User) => u.email === email)) {
      throw new Error("User already exists");
    }
    const newUser: User = { id: `user_${Date.now()}`, name, email };
    db.users.push(newUser);
    db.save();
    return newUser;
  },

  async login(email: string, pass: string): Promise<User> {
    await simulateDelay();
    const user = db.users.find((u: User) => u.email === email);
    if (!user) {
      throw new Error("Invalid credentials");
    }
    return user;
  },

  // --- BOOKS ---
  async getBooks(userId: string): Promise<Book[]> {
    await simulateDelay();
    return db.books.filter((b: Book) => b.userId === userId).reverse();
  },

  async getBook(bookId: string): Promise<Book | undefined> {
    await simulateDelay();
    return db.books.find((b: Book) => b.id === bookId);
  },

  async uploadBook(userId: string, file: File): Promise<Book> {
    await simulateDelay();
    const newBook: Book = {
      id: `book_${Date.now()}`,
      userId,
      title: file.name.replace('.pdf', ''),
      author: 'Processing...',
      coverImage: '',
      content: [],
      status: 'UPLOADING',
      isEmbedded: false,
    };
    db.books.push(newBook);
    db.save();
    
    // Start async processing
    this._processBookInBackground(newBook.id, file);

    return newBook;
  },
  
  async _processBookInBackground(bookId: string, file: File) {
    let book = db.books.find((b: Book) => b.id === bookId);
    if(!book) return;

    book.status = 'PROCESSING';
    db.save();

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const { pages, coverImage, title, author } = await processPdf(file);
      const flattenedContent: Block[] = pages.flatMap(p => p.blocks);
      
      book = db.books.find((b: Book) => b.id === bookId);
      if(book){
        book.content = flattenedContent;
        book.coverImage = coverImage;
        book.title = title;
        book.author = author;
        book.status = 'EMBEDDING'; // New status
        db.save();
        this._embedBookInBackground(bookId); // Start embedding
      }
    } catch(e) {
      console.error("Book processing failed:", e);
      if(book) book.status = 'FAILED';
      db.save();
    }
  },

  async _embedBookInBackground(bookId: string) {
    let book = db.books.find((b: Book) => b.id === bookId);
    if(!book) return;

    try {
        const batchSize = 20;
        for(let i = 0; i < book.content.length; i += batchSize) {
            await new Promise(resolve => setTimeout(resolve, 10)); 
            const batch = book.content.slice(i, i + batchSize);
            batch.forEach((block: Block, idx: number) => {
                 const newEmbedding: VectorEmbedding = {
                    id: `emb_${bookId}_${i + idx}`,
                    bookId: bookId,
                    paragraphIndex: i + idx,
                    text: block.text,
                };
                db.embeddings.push(newEmbedding);
            });
        }
        book = db.books.find((b: Book) => b.id === bookId);
        if (book) {
            book.status = 'READY';
            book.isEmbedded = true;
        }
    } catch(e) {
        console.error("Book embedding failed:", e);
        if(book) book.status = 'FAILED';
    }
    db.save();
  },

  // --- HIGHLIGHTS ---
  async getHighlights(userId: string, bookId: string): Promise<Highlight[]> {
    await simulateDelay();
    return db.highlights.filter((h: Highlight) => h.userId === userId && h.bookId === bookId);
  },

  async createHighlight(highlightData: Omit<Highlight, 'id'>): Promise<Highlight> {
    // Generate AI summary and flashcard
    let aiData = {};
    try {
        aiData = await createSummaryAndFlashcard(highlightData.text);
    } catch (e) {
        console.warn("Failed to generate AI summary/flashcard", e);
    }

    const newHighlight: Highlight = {
      ...highlightData,
      id: `hl_${Date.now()}`,
      ...aiData
    };
    db.highlights.push(newHighlight);
    db.save();
    return newHighlight;
  },

  // --- ILLUSTRATIONS ---
  async getIllustrations(userId: string, bookId: string): Promise<Illustration[]> {
    await simulateDelay();
    return db.illustrations.filter((i: Illustration) => i.userId === userId && i.bookId === bookId);
  },

  async createIllustration(data: Omit<Illustration, 'id' | 'imageUrl'>): Promise<Illustration> {
      const { sourceText, style, userId, bookId, paragraphIndex, isAutoGenerated, characterId } = data;
      const characterProfile = characterId ? db.character_profiles.find((cp: CharacterProfile) => cp.id === characterId) : undefined;
      
      const imageUrl = await generateIllustration(sourceText, style, characterProfile);

      const newIllustration: Illustration = {
          ...data,
          id: `ill_${Date.now()}`,
          imageUrl,
      };
      db.illustrations.push(newIllustration);
      db.save();
      return newIllustration;
  },
  
  async generateAutoIllustration(userId: string, bookId: string, paragraphIndex: number, paragraphText: string): Promise<Illustration | null> {
    const analysis = await analyzeParagraphForIllustration(paragraphText);

    if (!analysis.isVisuallySignificant) {
        return null;
    }
    
    let characterProfile: CharacterProfile | undefined;
    let characterId: string | undefined;

    if (analysis.characterName && analysis.characterDescription) {
        characterProfile = db.character_profiles.find((cp: CharacterProfile) => cp.bookId === bookId && cp.name.toLowerCase() === analysis.characterName!.toLowerCase());
        
        if (!characterProfile) {
            const newProfile: CharacterProfile = {
                id: `char_${Date.now()}`,
                bookId,
                name: analysis.characterName,
                description: analysis.characterDescription,
            };
            db.character_profiles.push(newProfile);
            db.save();
            characterProfile = newProfile;
        }
        characterId = characterProfile.id;
    }

    const imageUrl = await generateIllustration(analysis.prompt, 'Watercolor', characterProfile);
    
    const newIllustration: Illustration = {
        id: `ill_${Date.now()}`,
        userId,
        bookId,
        sourceText: paragraphText,
        imageUrl,
        style: 'Watercolor',
        isAutoGenerated: true,
        paragraphIndex,
        characterId,
    };
    
    db.illustrations.push(newIllustration);
    db.save();
    return newIllustration;
  },
  
  // --- CHARACTERS ---
  async getCharacters(userId: string, bookId: string): Promise<CharacterProfile[]> {
      await simulateDelay();
      // Characters are global per book in this simple DB, but we filter by bookId
      return db.character_profiles.filter((cp: CharacterProfile) => cp.bookId === bookId);
  },

  // --- BOOKMARKS ---
  async getBookmarks(userId: string, bookId: string): Promise<Bookmark[]> {
    await simulateDelay();
    return db.bookmarks.filter((b: Bookmark) => b.userId === userId && b.bookId === bookId);
  },

  async createBookmark(data: Omit<Bookmark, 'id'>): Promise<Bookmark> {
    await simulateDelay();
    const newBookmark: Bookmark = {
      ...data,
      id: `bm_${Date.now()}`
    };
    db.bookmarks.push(newBookmark);
    db.save();
    return newBookmark;
  },

  async deleteBookmark(bookmarkId: string): Promise<void> {
    await simulateDelay();
    db.bookmarks = db.bookmarks.filter((b: Bookmark) => b.id !== bookmarkId);
    db.save();
  },

  // --- SEARCH ---
  async searchBook(bookId: string, query: string): Promise<{ paragraphIndex: number; textSnippet: string }[]> {
    await simulateDelay();
    if (!query.trim()) return [];
    const book = db.books.find((b: Book) => b.id === bookId);
    if (!book) return [];

    const results: { paragraphIndex: number; textSnippet: string }[] = [];
    const lowerCaseQuery = query.toLowerCase();

    book.content.forEach((block: Block, index: number) => {
      if (block.text.toLowerCase().includes(lowerCaseQuery)) {
        results.push({
          paragraphIndex: index,
          textSnippet: block.text.substring(0, 150) + '...',
        });
      }
    });

    return results;
  },

  // --- AI QUERY ---
  async queryBook(bookId: string, query: string) {
    await simulateDelay();
    const book = db.books.find((b: Book) => b.id === bookId);
    
    // Allow query even if embedding is in progress, but warn or limit scope
    if (!book || !book.isEmbedded) {
         async function* notReadyStream() {
            yield { text: "I am still indexing this book. Please wait a moment and try again." };
        }
        return notReadyStream();
    }

    // Simulate Vector Search with keyword matching
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const bookEmbeddings = db.embeddings.filter((e: VectorEmbedding) => e.bookId === bookId);
    
    const scoredParagraphs = bookEmbeddings.map((emb: VectorEmbedding) => {
        let score = 0;
        const text = emb.text.toLowerCase();
        queryWords.forEach(word => {
            if (text.includes(word)) {
                score++;
            }
        });
        return { ...emb, score };
    }).filter((p: any) => p.score > 0)
      .sort((a: any, b: any) => b.score - a.score);

    const topK = 5;
    const context = scoredParagraphs.slice(0, topK).map((p: VectorEmbedding) => p.text).join("\n\n");

    if (!context) {
        async function* noContextStream() {
            yield { text: "I couldn't find any relevant passages in the book to answer that question directly." };
        }
        return noContextStream();
    }

    try {
        const response = await answerQuestionWithContext(query, context);
        return response;
    } catch (error) {
        console.error("AI Query Failed", error);
        async function* errorStream() {
            yield { text: "I'm sorry, I encountered an error while analyzing the book content." };
        }
        return errorStream();
    }
  },

  // --- DATA MANAGEMENT (Backup/Restore) ---
  async exportLibrary() {
    const data = {
        users: db.users,
        books: db.books,
        highlights: db.highlights,
        embeddings: db.embeddings,
        illustrations: db.illustrations,
        character_profiles: db.character_profiles,
        bookmarks: db.bookmarks
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `readx_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async importLibrary(file: File): Promise<boolean> {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Basic validation
        if(data.users && Array.isArray(data.users) && data.books && Array.isArray(data.books)) {
            db.users = data.users;
            db.books = data.books;
            db.highlights = data.highlights || [];
            db.embeddings = data.embeddings || [];
            db.illustrations = data.illustrations || [];
            db.character_profiles = data.character_profiles || [];
            db.bookmarks = data.bookmarks || [];
            db.save();
            return true;
        }
        throw new Error("Invalid backup file format");
    } catch (error) {
        console.error("Import failed:", error);
        throw error;
    }
  }
};
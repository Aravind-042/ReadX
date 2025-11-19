import React, { useState } from 'react';
import { Highlight, Illustration, Theme, Bookmark, CharacterProfile } from '../types';
import { CloseIcon, PencilIcon, BookmarkIcon, UserGroupIcon, PaletteIcon } from './icons';

interface NotesPanelProps {
  onClose: () => void;
  highlights: Highlight[];
  illustrations: Illustration[];
  bookmarks: Bookmark[];
  characters: CharacterProfile[];
  onBookmarkClick: (paragraphIndex: number) => void;
  onBookmarkDelete: (bookmarkId: string) => void;
  theme: Theme;
}

const Flashcard: React.FC<{ highlight: Highlight }> = ({ highlight }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    if (!highlight.flashcard) return null;

    return (
        <div className="mt-3 perspective-1000 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`relative w-full h-32 transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front */}
                <div className="absolute inset-0 backface-hidden bg-readx-accent/20 rounded-lg p-3 flex flex-col items-center justify-center border border-readx-accent/30">
                    <span className="text-xs uppercase tracking-wider opacity-70 mb-2">Question</span>
                    <p className="text-center text-sm font-medium">{highlight.flashcard.question}</p>
                    <p className="text-[10px] opacity-50 absolute bottom-2">Tap to flip</p>
                </div>
                {/* Back */}
                <div className="absolute inset-0 backface-hidden bg-green-600/20 rounded-lg p-3 flex flex-col items-center justify-center rotate-y-180 border border-green-500/30">
                    <span className="text-xs uppercase tracking-wider opacity-70 mb-2">Answer</span>
                    <p className="text-center text-sm font-medium">{highlight.flashcard.answer}</p>
                </div>
            </div>
        </div>
    );
};

export const NotesPanel: React.FC<NotesPanelProps> = ({ onClose, highlights, illustrations, bookmarks, characters, onBookmarkClick, onBookmarkDelete, theme }) => {
    const [activeTab, setActiveTab] = useState<'notes' | 'gallery' | 'bookmarks' | 'characters'>('notes');
    
    const themeClasses = {
        [Theme.Dark]: 'bg-readx-dark-secondary border-gray-700 text-readx-text-dark',
        [Theme.Light]: 'bg-readx-light-secondary border-gray-200 text-readx-text-light',
        [Theme.Sepia]: 'bg-amber-50 border-amber-200 text-sepia-text',
    };
    
    const tabButtonClass = (tabName: typeof activeTab) => `flex-1 py-3 text-xs font-medium transition-colors uppercase tracking-wide text-center flex flex-col items-center gap-1 ${activeTab === tabName ? 'bg-readx-accent text-white' : 'hover:bg-gray-700/20'}`;
    
    return (
        <aside className={`w-full md:w-1/3 max-w-md h-full flex flex-col border-l ${themeClasses[theme]} transition-colors duration-300`}>
            <header className="flex items-center justify-between p-4 border-b border-inherit">
                <h3 className="text-lg font-bold flex items-center gap-2"><PencilIcon className="w-5 h-5 text-readx-accent" /> Reader's Companion</h3>
                <button onClick={onClose} className="hover:text-readx-accent">
                    <CloseIcon className="w-6 h-6" />
                </button>
            </header>

            <div className="border-b border-inherit">
                <div className="flex overflow-x-auto">
                    <button onClick={() => setActiveTab('notes')} className={tabButtonClass('notes')}>
                        <PencilIcon className="w-4 h-4"/> Notes
                    </button>
                    <button onClick={() => setActiveTab('characters')} className={tabButtonClass('characters')}>
                        <UserGroupIcon className="w-4 h-4"/> Cast
                    </button>
                    <button onClick={() => setActiveTab('gallery')} className={tabButtonClass('gallery')}>
                        <PaletteIcon className="w-4 h-4"/> Art
                    </button>
                    <button onClick={() => setActiveTab('bookmarks')} className={tabButtonClass('bookmarks')}>
                        <BookmarkIcon className="w-4 h-4"/> Marks
                    </button>
                </div>
            </div>

            <div className="flex-grow p-4 overflow-y-auto">
                {activeTab === 'notes' && (
                    <div className="space-y-6">
                        {highlights.length === 0 && <p className="text-center text-sm text-gray-400 mt-8">Highlight text to auto-generate summaries and flashcards.</p>}
                        {highlights.map(hl => (
                            <div key={hl.id} className="bg-readx-dark p-4 rounded-lg shadow-sm">
                                <div className="mb-2">
                                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">Quote</p>
                                    <p className="text-sm font-serif border-l-2 border-readx-accent pl-3 italic">"{hl.text}"</p>
                                </div>
                                {hl.summary ? (
                                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                                        <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">AI Summary</p>
                                        <p className="text-sm text-gray-300">{hl.summary}</p>
                                        <Flashcard highlight={hl} />
                                    </div>
                                ) : (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 animate-pulse">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div> Generating insights...
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                
                {activeTab === 'characters' && (
                    <div className="space-y-4">
                        {characters.length === 0 && <p className="text-center text-sm text-gray-400 mt-8">Characters detected while reading will appear here.</p>}
                        {characters.map(char => (
                            <div key={char.id} className="flex items-start gap-4 bg-readx-dark p-4 rounded-lg">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                    <span className="text-lg font-bold text-white">{char.name.charAt(0)}</span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-readx-accent">{char.name}</h4>
                                    <p className="text-sm text-gray-300 mt-1 leading-relaxed">{char.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'gallery' && (
                     <div className="grid grid-cols-2 gap-4">
                         {illustrations.length === 0 && <p className="col-span-2 text-center text-sm text-gray-400 mt-8">Illustrations you create will appear here.</p>}
                        {illustrations.map(ill => (
                            <div key={ill.id} className="bg-readx-dark rounded-lg overflow-hidden group shadow-md hover:shadow-xl transition-all">
                                <img src={ill.imageUrl} alt={ill.sourceText} className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-110" />
                                <div className="p-2">
                                    <p className="text-xs text-gray-400 truncate italic">"{ill.isAutoGenerated ? 'Auto-generated scene' : ill.sourceText}"</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {activeTab === 'bookmarks' && (
                    <div className="space-y-3">
                        {bookmarks.length === 0 && <p className="text-center text-sm text-gray-400 mt-8">Click the bookmark icon to save a location.</p>}
                        {bookmarks.map(bm => (
                            <div key={bm.id} className="bg-readx-dark p-3 rounded-lg flex items-center justify-between group hover:bg-readx-dark-secondary/80 transition-colors">
                                <div onClick={() => onBookmarkClick(bm.paragraphIndex)} className="cursor-pointer flex-grow">
                                    <p className="text-sm font-semibold flex items-center gap-2 text-readx-accent"><BookmarkIcon className="w-4 h-4"/> Paragraph {bm.paragraphIndex + 1}</p>
                                    <p className="text-xs text-gray-400 mt-1 italic pl-6 line-clamp-2">"{bm.textSnippet}"</p>
                                </div>
                                <button onClick={() => onBookmarkDelete(bm.id)} className="text-gray-500 hover:text-red-500 p-2">
                                    <CloseIcon className="w-4 h-4"/>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </aside>
    );
};
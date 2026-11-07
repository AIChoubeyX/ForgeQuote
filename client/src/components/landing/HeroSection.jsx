import { Link } from 'react-router-dom';
import { FallingBlocks } from '../brand/FallingBlocks.jsx';
import { STAGES } from './content.js';

// A chunky stepped arrow pointing into the workflow below.
const ARROW_ROWS = ['...##...', '...##...', '...##...', '...##...', '########', '.######.', '..####..', '...##...'];
const ARROW_CELLS = ARROW_ROWS.flatMap((row, y) => [...row].flatMap((cell, x) => (cell === '#' ? [[x, y]] : [])));

export function HeroSection() {
  return (
    <section className="flex flex-col lg:min-h-[calc(100svh-3rem)]">
      <div data-nav="light" className="grid gap-6 px-5 pb-10 pt-12 sm:px-10 lg:grid-cols-[1fr_25%] lg:items-center lg:gap-10 lg:py-10">
        <h1 className="display-xl text-forge">
          From RFQ to<br />ready-to-send quote.
        </h1>
        <p className="max-w-md text-[15px] leading-relaxed text-forge">
          Turn customer requirements into traceable manufacturing costs and approved quotations, through one connected workflow.
        </p>
      </div>

      <div data-nav="dark" className="grid flex-1 bg-forge text-paper lg:grid-cols-[1fr_25%]">
        <div className="relative h-[46svh] min-h-64 lg:h-auto">
          <div className="absolute inset-0">
            <FallingBlocks />
          </div>
        </div>

        <aside className="flex flex-col border-t border-paper/40 lg:border-l lg:border-t-0">
          <div className="border-b border-paper/40 p-5 sm:px-8 sm:py-6">
            <p className="font-display text-2xl leading-tight xl:text-[1.75rem]">Four gates. One revision trail.</p>
          </div>
          <ol>
            {STAGES.map(stage => (
              <li key={stage.step} className="flex items-baseline gap-3 border-b border-paper/20 px-5 py-2.5 text-sm sm:px-8">
                <span className="font-mono text-xs opacity-80">{stage.step}</span>
                {stage.title}
              </li>
            ))}
          </ol>
          <div className="flex flex-1 flex-col justify-between gap-6 p-5 sm:px-8 sm:py-6">
            <a href="#workflow" aria-label="Go to the workflow" className="block w-fit transition-transform hover:translate-y-1">
              <svg width="44" height="44" viewBox="0 0 8 8" fill="currentColor" shapeRendering="crispEdges" aria-hidden="true">
                {ARROW_CELLS.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)}
              </svg>
            </a>
            <div className="flex flex-wrap justify-end gap-1.5">
              <a href="#workflow" className="button button-outline-invert min-h-10">See the workflow</a>
              <Link to="/login" className="button button-invert min-h-10">Sign in</Link>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

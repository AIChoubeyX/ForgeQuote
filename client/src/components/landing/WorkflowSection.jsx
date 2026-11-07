import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IsoStack } from '../brand/IsoStack.jsx';
import { STAGES } from './content.js';

// The pinned layout needs room for the intro and the open stage; shorter screens get the stacked one.
const DESKTOP = '(min-width: 1024px) and (min-height: 720px)';

function SectionIntro() {
  return (
    <div className="grid gap-5 lg:grid-cols-2 lg:gap-10">
      <h2 className="display-lg">Every gate signed,<br />every revision kept.</h2>
      <p className="max-w-xl text-[15px] leading-relaxed">
        A continuous, auditable progression. Automation assists, deterministic calculations keep the numbers accurate, and department heads hold final authority.
      </p>
    </div>
  );
}

function StageActions() {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link to="/login" className="button button-invert min-h-10">Sign in</Link>
      <a href="#capabilities" className="button button-outline-invert min-h-10">See capabilities</a>
    </div>
  );
}

function PinnedWorkflow() {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const { top, height } = trackRef.current.getBoundingClientRect();
      const progress = -top / (height - window.innerHeight);
      setActive(Math.min(STAGES.length - 1, Math.max(0, Math.floor(progress * STAGES.length))));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={trackRef} className="relative" style={{ height: `${STAGES.length * 100}vh` }}>
      {STAGES.map((stage, i) => (
        <span key={stage.step} id={`stage-${i + 1}`} className="absolute" style={{ top: `calc(${i * 75}vh + ${i ? '1vh' : '0px'})` }} />
      ))}
      <div className="sticky top-12 flex h-[calc(100vh-3rem)] flex-col px-10 pt-10">
        <SectionIntro />
        <div className="grid min-h-0 flex-1 grid-cols-2 items-center gap-10 pb-6">
          <div className="border border-paper/70">
            {STAGES.map((stage, i) => {
              const open = i === active;
              return (
                <div key={stage.step} className={i ? 'border-t border-paper/70' : ''}>
                  <a href={`#stage-${i + 1}`} aria-current={open ? 'step' : undefined} className="flex items-baseline justify-between gap-4 px-6 py-3.5">
                    <span className="display-lg !text-[1.75rem]">{stage.title}</span>
                    <span className="font-mono text-xs">{stage.step}</span>
                  </a>
                  <div className={`grid transition-[grid-template-rows] duration-500 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                    <div className={`overflow-hidden ${open ? '' : 'invisible'}`}>
                      <div className="px-6 pb-5">
                        <p className="max-w-md text-[15px] leading-relaxed">{stage.description}</p>
                        <p className="mb-4 mt-2 text-xs">{stage.role}</p>
                        <StageActions />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex h-full min-h-0 items-center justify-end">
            <IsoStack active={active} className="h-full max-h-[34rem] w-auto max-w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StackedWorkflow() {
  return (
    <div className="px-5 py-14 sm:px-10">
      <SectionIntro />
      <div className="mt-10 border border-paper/70">
        {STAGES.map((stage, i) => (
          <article key={stage.step} id={`stage-${i + 1}`} className={`scroll-mt-12 p-5 sm:p-8 ${i ? 'border-t border-paper/70' : ''}`}>
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="display-lg !text-2xl">{stage.title}</h3>
              <span className="font-mono text-xs">{stage.step}</span>
            </div>
            <IsoStack active={i} className="mx-auto my-5 w-full max-w-sm" />
            <p className="text-[15px] leading-relaxed">{stage.description}</p>
            <p className="mb-4 mt-2 text-xs">{stage.role}</p>
            <StageActions />
          </article>
        ))}
      </div>
    </div>
  );
}

export function WorkflowSection() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP);
    const onChange = event => setDesktop(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return (
    <section id="workflow" data-nav="dark" className="scroll-mt-12 bg-forge text-paper">
      {desktop ? <PinnedWorkflow /> : <StackedWorkflow />}
    </section>
  );
}

import SkillTreeRenderer from '../components/SkillTreeRenderer';

export default function SkillTreeBuilderPage() {
  return (
    <div className="ct-page">
      <div className="ct-page__header">
        <div className="ct-page__info">
          <span className="ct-page__nickname">Asterism Builder</span>
        </div>
      </div>
      <div className="ct-page__tree">
        <SkillTreeRenderer height="100%" interactive />
      </div>
    </div>
  );
}

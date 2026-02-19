import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SkillTreeRenderer from '../components/SkillTreeRenderer';

const API_BASE = '/api';

interface CharacterBrief {
  nickname: string;
  classId: string;
  level: number;
  allocatedNodes: number[];
}

export default function CharacterTreePage() {
  const { characterId } = useParams<{ characterId: string }>();
  const [data, setData] = useState<CharacterBrief | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!characterId) return;
    fetch(`${API_BASE}/leaderboard/character/${characterId}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d.character))
      .catch((e) => setError(e.message));
  }, [characterId]);

  if (error) {
    return (
      <div className="ct-page ct-page--center">
        <span>{'\u26A0\uFE0F'} {error}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ct-page ct-page--center">
        <span>{'\u23F3'} Loading...</span>
      </div>
    );
  }

  const className = data.classId.charAt(0).toUpperCase() + data.classId.slice(1);

  return (
    <div className="ct-page">
      <div className="ct-page__header">
        <div className="ct-page__info">
          <span className="ct-page__nickname">{data.nickname}</span>
          <span className="ct-page__sub">
            {className} &middot; Lv.{data.level}
            {data.allocatedNodes.length > 0 && ` \u00B7 ${data.allocatedNodes.length} nodes`}
          </span>
        </div>
      </div>
      <div className="ct-page__tree">
        <SkillTreeRenderer
          allocatedNodes={data.allocatedNodes}
          classId={data.classId}
          height="100%"
        />
      </div>
    </div>
  );
}

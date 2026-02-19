import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import CharactersPage from './pages/CharactersPage';
import EquipmentPage from './pages/EquipmentPage';
import EnemiesPage from './pages/EnemiesPage';
import ChampionsPage from './pages/ChampionsPage';
import SkillTreePage from './pages/SkillTreePage';
import CharacterTreePage from './pages/CharacterTreePage';
import SkillTreeBuilderPage from './pages/SkillTreeBuilderPage';
import DamagePage from './pages/DamagePage';
import PlotPage from './pages/PlotPage';
import MapsPage from './pages/MapsPage';
import TradePage from './pages/TradePage';

export default function App() {
  return (
    <Routes>
      {/* Fullscreen pages — no Layout wrapper */}
      <Route path="character/:characterId/tree" element={<CharacterTreePage />} />
      <Route path="skill-tree/builder" element={<SkillTreeBuilderPage />} />

      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="characters" element={<CharactersPage />} />
        <Route path="equipment" element={<EquipmentPage />} />
        <Route path="enemies" element={<EnemiesPage />} />
        <Route path="champions" element={<ChampionsPage />} />
        <Route path="skill-tree" element={<SkillTreePage />} />
        <Route path="damage" element={<DamagePage />} />
        <Route path="plot" element={<PlotPage />} />
        <Route path="maps" element={<MapsPage />} />
        <Route path="trade" element={<TradePage />} />
      </Route>
    </Routes>
  );
}

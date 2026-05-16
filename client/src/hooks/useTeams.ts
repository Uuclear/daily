import { useEffect, useState } from 'react';
import type { Team } from '../types/models';
import * as api from '../api/client';

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('全部班组');

  useEffect(() => {
    api.getTeams().then(setTeams).catch(() => {});
  }, []);

  return { teams, selectedTeam, setSelectedTeam };
}

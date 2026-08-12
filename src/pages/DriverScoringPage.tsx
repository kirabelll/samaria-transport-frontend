import { useState, useEffect } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { Trophy, Award, Settings, Plus, Star, Calculator, Gift, CheckCircle, Play } from 'lucide-react';
import { driverScoringApi, driverRewardsApi, employeeApi } from '../services/api';
import Modal from '../components/ui/Modal';
import StatusBadge from '../components/ui/StatusBadge';

interface ScoreRow {
  rank: number;
  driverId: string;
  name: string;
  totalScore: number;
  tripCount: number;
  tripScore: number;
  shortageScore: number;
  cycleTimeScore: number;
  fuelScore: number;
  attendanceScore: number;
  safetyScore: number;
}

interface RewardRow {
  id: string;
  driverName: string;
  type: string;
  amount: number;
  reason: string;
  month: number;
  year: number;
  status: string;
}

interface ScoringConfig {
  id: string;
  tripCountWeight: number;
  shortageWeight: number;
  cycleTimeWeight: number;
  fuelEfficiencyWeight: number;
  attendanceWeight: number;
  safetyWeight: number;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function DriverScoringPage() {
  const [tab, setTab] = useState<'leaderboard' | 'rewards' | 'config'>('leaderboard');

  // --- Leaderboard state ---
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<ScoreRow | null>(null);

  // --- Rewards state ---
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showAddReward, setShowAddReward] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [rewardForm, setRewardForm] = useState({
    driverId: '',
    type: 'reward',
    amount: '',
    reason: '',
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  // --- Config state ---
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  const [configForm, setConfigForm] = useState({
    tripCountWeight: 20,
    shortageWeight: 25,
    cycleTimeWeight: 15,
    fuelEfficiencyWeight: 15,
    attendanceWeight: 15,
    safetyWeight: 10,
  });
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // --- Load leaderboard ---
  const loadLeaderboard = () => {
    setLoadingScores(true);
    driverScoringApi.leaderboard({ month, year })
      .then(r => setScores(r.data.scores || []))
      .catch(console.error)
      .finally(() => setLoadingScores(false));
  };

  // --- Load rewards ---
  const loadRewards = () => {
    setLoadingRewards(true);
    driverRewardsApi.list({ month, year })
      .then(r => setRewards(r.data.items || []))
      .catch(console.error)
      .finally(() => setLoadingRewards(false));
  };

  // --- Load config ---
  const loadConfig = () => {
    setLoadingConfig(true);
    driverScoringApi.config()
      .then(r => {
        const c = r.data.config;
        if (c) {
          setConfig(c);
          setConfigForm({
            tripCountWeight: c.tripCountWeight,
            shortageWeight: c.shortageWeight,
            cycleTimeWeight: c.cycleTimeWeight,
            fuelEfficiencyWeight: c.fuelEfficiencyWeight,
            attendanceWeight: c.attendanceWeight,
            safetyWeight: c.safetyWeight,
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoadingConfig(false));
  };

  // --- Load employees for reward form ---
  const loadEmployees = () => {
    employeeApi.list({ role: 'driver', status: 'active' })
      .then(r => setEmployees(r.data.employees || r.data || []))
      .catch(console.error);
  };

  useEffect(() => {
    if (tab === 'leaderboard') loadLeaderboard();
    if (tab === 'rewards') { loadRewards(); loadEmployees(); }
    if (tab === 'config') loadConfig();
  }, [tab]);

  useEffect(() => {
    if (tab === 'leaderboard') loadLeaderboard();
    if (tab === 'rewards') loadRewards();
  }, [month, year]);

  // --- Calculate scores ---
  const handleCalculate = () => {
    setCalculating(true);
    driverScoringApi.calculate({ month, year })
      .then(() => loadLeaderboard())
      .catch(console.error)
      .finally(() => setCalculating(false));
  };

  // --- Generate rewards from scores ---
  const handleGenerate = () => {
    setGenerating(true);
    driverRewardsApi.generate({ month, year })
      .then(() => loadRewards())
      .catch(console.error)
      .finally(() => setGenerating(false));
  };

  // --- Approve / Apply reward ---
  const handleApprove = (id: string) => {
    driverRewardsApi.approve(id)
      .then(() => loadRewards())
      .catch(console.error);
  };

  const handleApply = (id: string) => {
    driverRewardsApi.apply(id)
      .then(() => loadRewards())
      .catch(console.error);
  };

  // --- Add manual reward ---
  const handleAddReward = () => {
    driverRewardsApi.create({
      driverId: rewardForm.driverId,
      type: rewardForm.type,
      amount: Number(rewardForm.amount),
      reason: rewardForm.reason,
      month: rewardForm.month,
      year: rewardForm.year,
    })
      .then(() => {
        setShowAddReward(false);
        setRewardForm({ driverId: '', type: 'reward', amount: '', reason: '', month: now.getMonth() + 1, year: now.getFullYear() });
        loadRewards();
      })
      .catch(console.error);
  };

  // --- Save config ---
  const handleSaveConfig = () => {
    setSavingConfig(true);
    driverScoringApi.updateConfig(configForm)
      .then(r => {
        if (r.data.config) setConfig(r.data.config);
        loadConfig();
      })
      .catch(console.error)
      .finally(() => setSavingConfig(false));
  };

  // --- Radar chart data for selected driver ---
  const radarData = selectedDriver ? [
    { metric: 'Trip Count', value: selectedDriver.tripScore, fullMark: 100 },
    { metric: 'Shortage', value: selectedDriver.shortageScore, fullMark: 100 },
    { metric: 'Cycle Time', value: selectedDriver.cycleTimeScore, fullMark: 100 },
    { metric: 'Fuel', value: selectedDriver.fuelScore, fullMark: 100 },
    { metric: 'Attendance', value: selectedDriver.attendanceScore, fullMark: 100 },
    { metric: 'Safety', value: selectedDriver.safetyScore, fullMark: 100 },
  ] : [];

  const tabs = [
    { key: 'leaderboard' as const, label: 'Leaderboard', icon: Trophy },
    { key: 'rewards' as const, label: 'Rewards', icon: Award },
    { key: 'config' as const, label: 'Config', icon: Settings },
  ];

  const yearOptions = [];
  for (let y = now.getFullYear() - 2; y <= now.getFullYear(); y++) yearOptions.push(y);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Star className="w-5 h-5" /> Driver Scoring & Rewards
        </h2>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg overflow-x-auto no-scrollbar">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ LEADERBOARD TAB ═══════════ */}
      {tab === 'leaderboard' && (
        <div className="space-y-4">
          {/* Filters row */}
          <div className="card">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="label">Month</label>
                <select className="select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <select className="select" value={year} onChange={e => setYear(Number(e.target.value))}>
                  {yearOptions.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                className="btn-primary flex items-center gap-1.5"
                onClick={handleCalculate}
                disabled={calculating}
              >
                <Calculator className="w-4 h-4" />
                {calculating ? 'Calculating...' : 'Calculate Scores'}
              </button>
            </div>
          </div>

          {/* Scores table */}
          {loadingScores ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
          ) : scores.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">
              No scores found for {MONTHS[month - 1]} {year}. Click "Calculate Scores" to generate.
            </div>
          ) : (
            <div className="card">
              <h3 className="section-title mb-4">Driver Rankings - {MONTHS[month - 1]} {year}</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="th">Rank</th>
                      <th className="th">Driver</th>
                      <th className="th">Total Score</th>
                      <th className="th">Trip Score</th>
                      <th className="th">Shortage Score</th>
                      <th className="th">Cycle Time</th>
                      <th className="th">Fuel</th>
                      <th className="th">Attendance</th>
                      <th className="th">Safety</th>
                      <th className="th">Trip Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map(s => (
                      <tr
                        key={s.driverId}
                        className="tr cursor-pointer hover:bg-blue-50"
                        onClick={() => setSelectedDriver(selectedDriver?.driverId === s.driverId ? null : s)}
                      >
                        <td className="td">
                          <span className="flex items-center gap-1">
                            {s.rank <= 3 && <Trophy className={`w-4 h-4 ${s.rank === 1 ? 'text-yellow-500' : s.rank === 2 ? 'text-gray-400' : 'text-amber-600'}`} />}
                            {s.rank}
                          </span>
                        </td>
                        <td className="td font-medium">{s.name}</td>
                        <td className="td">
                          <span className="font-semibold text-blue-600">{(s.totalScore ?? 0).toFixed(1)}</span>
                        </td>
                        <td className="td">{(s.tripScore ?? 0).toFixed(1)}</td>
                        <td className="td">{(s.shortageScore ?? 0).toFixed(1)}</td>
                        <td className="td">{(s.cycleTimeScore ?? 0).toFixed(1)}</td>
                        <td className="td">{(s.fuelScore ?? 0).toFixed(1)}</td>
                        <td className="td">{(s.attendanceScore ?? 0).toFixed(1)}</td>
                        <td className="td">{(s.safetyScore ?? 0).toFixed(1)}</td>
                        <td className="td">{s.tripCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Radar chart for selected driver */}
          {selectedDriver && (
            <div className="card">
              <h3 className="section-title mb-4 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-500" />
                Score Breakdown - {selectedDriver.name}
              </h3>
              <div className="flex flex-col md:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name={selectedDriver.name}
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.25}
                    />
                  </RadarChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 text-sm min-w-[200px]">
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <div className="text-blue-600 font-semibold text-lg">{(selectedDriver.totalScore ?? 0).toFixed(1)}</div>
                    <div className="text-gray-500">Total Score</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-green-600 font-semibold text-lg">{selectedDriver.tripCount}</div>
                    <div className="text-gray-500">Trips</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <div className="text-yellow-600 font-semibold text-lg">#{selectedDriver.rank}</div>
                    <div className="text-gray-500">Rank</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <div className="text-purple-600 font-semibold text-lg">{(selectedDriver.safetyScore ?? 0).toFixed(1)}</div>
                    <div className="text-gray-500">Safety</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════ REWARDS TAB ═══════════ */}
      {tab === 'rewards' && (
        <div className="space-y-4">
          {/* Action row */}
          <div className="card">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="label">Month</label>
                <select className="select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Year</label>
                <select className="select" value={year} onChange={e => setYear(Number(e.target.value))}>
                  {yearOptions.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                className="btn-primary flex items-center gap-1.5"
                onClick={handleGenerate}
                disabled={generating}
              >
                <Gift className="w-4 h-4" />
                {generating ? 'Generating...' : 'Generate from Scores'}
              </button>
              <button
                className="btn-secondary flex items-center gap-1.5"
                onClick={() => setShowAddReward(true)}
              >
                <Plus className="w-4 h-4" />
                Add Manual
              </button>
            </div>
          </div>

          {/* Rewards table */}
          {loadingRewards ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
          ) : rewards.length === 0 ? (
            <div className="card text-center py-10 text-gray-400">
              No rewards/penalties found for {MONTHS[month - 1]} {year}.
            </div>
          ) : (
            <div className="card">
              <h3 className="section-title mb-4">Rewards & Penalties - {MONTHS[month - 1]} {year}</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th className="th">Driver</th>
                      <th className="th">Type</th>
                      <th className="th">Amount</th>
                      <th className="th">Reason</th>
                      <th className="th">Month</th>
                      <th className="th">Status</th>
                      <th className="th">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.map(r => (
                      <tr key={r.id} className="tr">
                        <td className="td font-medium">{r.driverName}</td>
                        <td className="td">
                          <span className={r.type === 'reward' ? 'badge-green' : 'badge-red'}>
                            {r.type}
                          </span>
                        </td>
                        <td className="td">
                          <span className={r.type === 'reward' ? 'text-green-600' : 'text-red-600'}>
                            {r.type === 'reward' ? '+' : '-'}ETB {(r.amount ?? 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="td text-gray-500 max-w-[200px] truncate">{r.reason}</td>
                        <td className="td">{MONTHS[(r.month || 1) - 1]} {r.year}</td>
                        <td className="td"><StatusBadge status={r.status} /></td>
                        <td className="td">
                          <div className="flex gap-1.5">
                            {r.status === 'pending' && (
                              <button
                                className="btn-success text-xs flex items-center gap-1"
                                onClick={() => handleApprove(r.id)}
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Approve
                              </button>
                            )}
                            {r.status === 'approved' && (
                              <button
                                className="btn-primary text-xs flex items-center gap-1"
                                onClick={() => handleApply(r.id)}
                              >
                                <Play className="w-3.5 h-3.5" />
                                Apply
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add Manual Reward Modal */}
          {showAddReward && (
            <Modal title="Add Manual Reward/Penalty" onClose={() => setShowAddReward(false)}>
              <div className="space-y-4">
                <div>
                  <label className="label">Driver</label>
                  <select
                    className="select w-full"
                    value={rewardForm.driverId}
                    onChange={e => setRewardForm({ ...rewardForm, driverId: e.target.value })}
                  >
                    <option value="">Select driver...</option>
                    {employees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Type</label>
                  <select
                    className="select w-full"
                    value={rewardForm.type}
                    onChange={e => setRewardForm({ ...rewardForm, type: e.target.value })}
                  >
                    <option value="reward">Reward</option>
                    <option value="penalty">Penalty</option>
                  </select>
                </div>
                <div>
                  <label className="label">Amount (ETB)</label>
                  <input
                    type="number"
                    className="input w-full"
                    placeholder="0"
                    value={rewardForm.amount}
                    onChange={e => setRewardForm({ ...rewardForm, amount: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Reason</label>
                  <input
                    type="text"
                    className="input w-full"
                    placeholder="Reason for reward/penalty"
                    value={rewardForm.reason}
                    onChange={e => setRewardForm({ ...rewardForm, reason: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Month</label>
                    <select
                      className="select w-full"
                      value={rewardForm.month}
                      onChange={e => setRewardForm({ ...rewardForm, month: Number(e.target.value) })}
                    >
                      {MONTHS.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Year</label>
                    <select
                      className="select w-full"
                      value={rewardForm.year}
                      onChange={e => setRewardForm({ ...rewardForm, year: Number(e.target.value) })}
                    >
                      {yearOptions.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button className="btn-ghost" onClick={() => setShowAddReward(false)}>Cancel</button>
                  <button
                    className="btn-primary"
                    onClick={handleAddReward}
                    disabled={!rewardForm.driverId || !rewardForm.amount || !rewardForm.reason}
                  >
                    Save
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {/* ═══════════ CONFIG TAB ═══════════ */}
      {tab === 'config' && (
        <div className="space-y-4">
          {loadingConfig ? (
            <div className="text-center py-10 text-gray-400">Loading...</div>
          ) : (
            <div className="card max-w-xl">
              <h3 className="section-title mb-4 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Scoring Weight Configuration
              </h3>
              <p className="text-sm text-gray-500 mb-5">
                Adjust the weights for each scoring dimension. Weights determine how much each factor contributes to the total driver score.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="label">Trip Count Weight</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={configForm.tripCountWeight}
                    onChange={e => setConfigForm({ ...configForm, tripCountWeight: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="label">Shortage Weight</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={configForm.shortageWeight}
                    onChange={e => setConfigForm({ ...configForm, shortageWeight: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="label">Cycle Time Weight</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={configForm.cycleTimeWeight}
                    onChange={e => setConfigForm({ ...configForm, cycleTimeWeight: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="label">Fuel Efficiency Weight</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={configForm.fuelEfficiencyWeight}
                    onChange={e => setConfigForm({ ...configForm, fuelEfficiencyWeight: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="label">Attendance Weight</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={configForm.attendanceWeight}
                    onChange={e => setConfigForm({ ...configForm, attendanceWeight: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>
                <div>
                  <label className="label">Safety Weight</label>
                  <input
                    type="number"
                    className="input w-full"
                    value={configForm.safetyWeight}
                    onChange={e => setConfigForm({ ...configForm, safetyWeight: Number(e.target.value) })}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                  Total weight: <span className={`font-semibold ${
                    Object.values(configForm).reduce((a, b) => a + b, 0) === 100 ? 'text-green-600' : 'text-red-500'
                  }`}>
                    {Object.values(configForm).reduce((a, b) => a + b, 0)}
                  </span> / 100
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    className="btn-primary flex items-center gap-1.5"
                    onClick={handleSaveConfig}
                    disabled={savingConfig}
                  >
                    {savingConfig ? 'Saving...' : 'Save Configuration'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

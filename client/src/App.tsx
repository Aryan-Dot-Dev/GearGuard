import { useEffect, useMemo, useState, type ReactNode } from "react";
import "./App.css";

type TeamRole = "manager" | "technician";
type RequestType = "corrective" | "preventive";
type RequestState = "new" | "in_progress" | "repaired" | "scrap";

type TeamMember = {
  id: string;
  name: string;
  userId: string;
  role: TeamRole;
  teamId: string;
};

type Team = {
  id: string;
  name: string;
  members?: TeamMember[];
};

type Equipment = {
  id: string;
  name: string;
  serialNumber: string;
  owner: string;
  location: string;
  status: string;
  maintenanceTeamId: string;
};

type MaintenanceRequest = {
  id: string;
  subject: string;
  description?: string;
  type: RequestType;
  state: RequestState;
  equipmentId: string;
  teamId: string;
  technicianId: string;
  dueDate?: string;
  scheduledDate?: string;
  overdue?: boolean;
  equipment?: Equipment;
  technician?: TeamMember;
};

type KanbanBuckets = Record<RequestState, MaintenanceRequest[]>;

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5000/api";
const friendlyError = "Whoops! Something went wonky. Try again.";

async function api<T>(path: string, options: RequestInit = {}, userId: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId,
      ...(options.headers ?? {})
    }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

function Badge({ label, tone = "blue" }: { label: string; tone?: "green" | "amber" | "blue" | "red" | "pink" }) {
  return <span className={`pill pill-${tone}`}>{label}</span>;
}

function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">{title}</p>
        </div>
        {actions && <div className="panel-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

function App() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [kanban, setKanban] = useState<KanbanBuckets | null>(null);
  const [userId, setUserId] = useState("alex.mechanic");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [assignTechnicianId, setAssignTechnicianId] = useState<string>("");
  const [form, setForm] = useState({
    subject: "",
    type: "corrective" as RequestType,
    equipmentId: "",
    dueDate: "",
    scheduledDate: ""
  });

  const typeLabels: Record<RequestType, string> = {
    corrective: "Quick fix",
    preventive: "Tune-up"
  };

  const stateLabels: Record<RequestState, string> = {
    new: "Fresh",
    in_progress: "Fixing",
    repaired: "All good",
    scrap: "Retired"
  };

  const roleLabels: Record<TeamRole, string> = {
    manager: "Crew lead",
    technician: "Helper"
  };

  const members: TeamMember[] = useMemo(
    () => teams.flatMap((t) => t.members ?? []),
    [teams]
  );

  const handleUiError = (err: unknown) => {
    console.error(err);
    setError(friendlyError);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [teamsRes, equipmentRes, kanbanRes] = await Promise.all([
          api<Team[]>("/teams", { method: "GET" }, userId),
          api<Equipment[]>("/equipment", { method: "GET" }, userId),
          api<KanbanBuckets>("/requests/kanban", { method: "GET" }, userId)
        ]);
        setTeams(teamsRes);
        setEquipment(equipmentRes);
        setKanban(kanbanRes);
        setError(null);
      } catch (err) {
        handleUiError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const handleCreateRequest = async () => {
    if (!form.subject || !form.equipmentId) {
      setError("Please add a title and pick gear.");
      return;
    }
    try {
      setError(null);
      await api<MaintenanceRequest>("/requests", {
        method: "POST",
        body: JSON.stringify({
          subject: form.subject,
          type: form.type,
          equipmentId: form.equipmentId,
          dueDate: form.dueDate || undefined,
          scheduledDate: form.type === "preventive" ? form.scheduledDate || undefined : undefined
        })
      }, userId);

      setForm((prev) => ({ ...prev, subject: "", dueDate: "", scheduledDate: "" }));
      const [equipmentRes, kanbanRes] = await Promise.all([
        api<Equipment[]>("/equipment", { method: "GET" }, userId),
        api<KanbanBuckets>("/requests/kanban", { method: "GET" }, userId)
      ]);
      setEquipment(equipmentRes);
      setKanban(kanbanRes);
    } catch (err) {
      handleUiError(err);
    }
  };

  const refreshKanban = async () => {
    const data = await api<KanbanBuckets>("/requests/kanban", { method: "GET" }, userId);
    setKanban(data);
    return data;
  };

  const localMove = (id: string, nextState: RequestState) => {
    setKanban((prev) => {
      if (!prev) return prev;
      const updated: KanbanBuckets = {
        new: [...prev.new],
        in_progress: [...prev.in_progress],
        repaired: [...prev.repaired],
        scrap: [...prev.scrap]
      };

      let moving: MaintenanceRequest | undefined;
      (Object.keys(updated) as RequestState[]).forEach((state) => {
        const idx = updated[state].findIndex((r) => r.id === id);
        if (idx >= 0) {
          moving = { ...updated[state][idx], state: nextState };
          updated[state].splice(idx, 1);
        }
      });
      if (moving) {
        const overdue =
          moving.dueDate &&
          new Date(moving.dueDate).getTime() < Date.now() &&
          !["repaired", "scrap"].includes(nextState);
        updated[nextState].unshift({ ...moving, state: nextState, overdue });
      }
      return updated;
    });
  };

  const moveRequest = async (id: string, nextState: RequestState) => {
    try {
      setError(null);
      localMove(id, nextState);
      const updated = await api<MaintenanceRequest>(`/requests/${id}/state`, {
        method: "PATCH",
        body: JSON.stringify({ state: nextState })
      }, userId);
      setSelectedRequest((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev));
      await refreshKanban();
    } catch (err) {
      await refreshKanban();
      handleUiError(err);
    } finally {
      setDraggingId(null);
    }
  };

  const handleDrop = (state: RequestState) => {
    if (draggingId) {
      void moveRequest(draggingId, state);
    }
  };

  const openDetails = async (id: string) => {
    try {
      setDetailLoading(true);
      const detail = await api<MaintenanceRequest>(`/requests/${id}`, { method: "GET" }, userId);
      setSelectedRequest(detail);
      setAssignTechnicianId(detail.technicianId ?? "");
    } catch (err) {
      handleUiError(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetails = () => setSelectedRequest(null);

  const assignTechnician = async () => {
    if (!selectedRequest || !assignTechnicianId) return;
    try {
      setDetailLoading(true);
      const updated = await api<MaintenanceRequest>(
        `/requests/${selectedRequest.id}/assign`,
        {
          method: "PATCH",
          body: JSON.stringify({ technicianId: assignTechnicianId })
        },
        userId
      );
      setSelectedRequest(updated);
      await refreshKanban();
    } catch (err) {
      handleUiError(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const allowedTransitions: Record<RequestState, RequestState[]> = {
    new: ["in_progress", "scrap"],
    in_progress: ["repaired", "scrap"],
    repaired: [],
    scrap: []
  };

  const requestColumns: { key: RequestState; label: string; tone: "blue" | "amber" | "green" | "red" | "pink" }[] = [
    { key: "new", label: stateLabels.new, tone: "pink" },
    { key: "in_progress", label: stateLabels.in_progress, tone: "amber" },
    { key: "repaired", label: stateLabels.repaired, tone: "green" },
    { key: "scrap", label: stateLabels.scrap, tone: "red" }
  ];

  return (
    <div className="app-shell">
      <div className="paper-noise" aria-hidden="true" />
      <header className="hero-block">
        <div>
          <h1 className="hero-title">Control Board</h1>
        </div>
        <div className="user-picker">
          <div className="picker-row">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="picker-select"
            >
              {members.map((m) => (
                <option key={m.id} value={m.userId}>
                  {m.name} — {roleLabels[m.role]}
                </option>
              ))}
              {!members.length && <option value="alex.mechanic">Alex (seeded)</option>}
            </select>
          </div>
        </div>
      </header>

      {error && <div className="loud-alert">{error}</div>}

      <div className="content-grid">
        <div className="board-stack">
          <Card
            title="Fix cards"
            actions={<span className="live-pill">{loading ? "Loading..." : "Live board"}</span>}
          >
            <div className="kanban-grid">
              {requestColumns.map((col) => (
                <div
                  key={col.key}
                  className={`kanban-col kanban-${col.tone} ${draggingId ? "kanban-active" : ""}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(col.key)}
                >
                  <div className="kanban-head">
                    <span className="kanban-label">{col.label}</span>
                    <Badge label={`${kanban?.[col.key]?.length ?? 0}`} tone={col.tone} />
                  </div>
                  <div className="card-stack">
                    {(kanban?.[col.key] ?? []).map((req) => (
                      <article
                        key={req.id}
                        draggable
                        onDragStart={() => setDraggingId(req.id)}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={() => openDetails(req.id)}
                        className="request-card"
                      >
                        <div className="card-top">
                          <span className="card-title">{req.subject}</span>
                          {req.overdue && <Badge label="Late" tone="red" />}
                        </div>
                        <p className="card-line">{typeLabels[req.type]}</p>
                        {req.equipment && <p className="card-line subtle">Gear: {req.equipment.name}</p>}
                        {req.dueDate && (
                          <p className="card-line subtle">Finish by: {new Date(req.dueDate).toLocaleDateString()}</p>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Gear shelf">
            <p className="panel-sub">Bright list of stuff in play.</p>
            <div className="gear-grid">
              {equipment.map((eq) => (
                <div key={eq.id} className="gear-card">
                  <div className="gear-row">
                    <h3 className="gear-name">{eq.name}</h3>
                    <Badge
                      label={eq.status === "scrapped" ? "Retired" : "Ready"}
                      tone={eq.status === "scrapped" ? "red" : "green"}
                    />
                  </div>
                  <p className="gear-line">Tag: {eq.serialNumber}</p>
                  <p className="gear-line">Spot: {eq.location}</p>
                </div>
              ))}
              {!equipment.length && <p className="panel-sub">No gear yet.</p>}
            </div>
          </Card>
        </div>

        <div className="side-stack">
          <Card title="Add a fix card">
            <div className="form-grid">
              <label className="input-label">What's up?</label>
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="input-field"
                placeholder="e.g. Drip under the pump"
              />

              <label className="input-label">Kind of job</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as RequestType })}
                className="input-field"
              >
                <option value="corrective">Quick fix</option>
                <option value="preventive">Tune-up</option>
              </select>

              <label className="input-label">Pick gear</label>
              <select
                value={form.equipmentId}
                onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
                className="input-field"
              >
                <option value="">Select a piece</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} — {eq.location}
                  </option>
                ))}
              </select>

              <div className="form-row">
                <div className="form-half">
                  <label className="input-label">Finish by</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="input-field"
                  />
                </div>
                {form.type === "preventive" && (
                  <div className="form-half">
                    <label className="input-label">Plan date</label>
                    <input
                      type="date"
                      value={form.scheduledDate}
                      onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                      className="input-field"
                    />
                  </div>
                )}
              </div>

              <button onClick={handleCreateRequest} className="primary-btn">
                Drop it on the board
              </button>
              <p className="panel-sub">We nudge the right crew automatically.</p>
            </div>
          </Card>

          <Card title="Crews & helpers">
            <div className="crew-list">
              {teams.map((team) => (
                <div key={team.id} className="crew-card">
                  <div className="crew-row">
                    <span className="crew-name">{team.name}</span>
                    <Badge label={`${team.members?.length ?? 0} on deck`} tone="blue" />
                  </div>
                  <div className="crew-members">
                    {(team.members ?? []).map((m) => (
                      <span key={m.id} className="mini-chip dark">
                        {m.name} · {roleLabels[m.role]}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {!teams.length && <p className="panel-sub">No crews yet.</p>}
            </div>
          </Card>
        </div>
      </div>

      {selectedRequest && (
        <div className="modal-shell" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-head">
              <div>
                <p className="eyebrow">Card</p>
                <h3 className="modal-title">{selectedRequest.subject}</h3>
                <div className="chip-row">
                  <Badge label={typeLabels[selectedRequest.type]} tone="blue" />
                  <Badge label={stateLabels[selectedRequest.state]} tone="amber" />
                  {selectedRequest.overdue && <Badge label="Late" tone="red" />}
                </div>
              </div>
              <button onClick={closeDetails} className="close-btn" aria-label="Close">✕</button>
            </div>

            <div className="modal-body">
              {selectedRequest.description && <p className="card-line">{selectedRequest.description}</p>}
              <p className="card-line">Gear: {selectedRequest.equipment?.name ?? selectedRequest.equipmentId}</p>
              {selectedRequest.dueDate && <p className="card-line">Finish by: {new Date(selectedRequest.dueDate).toLocaleString()}</p>}
              {selectedRequest.scheduledDate && <p className="card-line">Plan date: {new Date(selectedRequest.scheduledDate).toLocaleString()}</p>}
              {selectedRequest.technician && <p className="card-line">Helper: {selectedRequest.technician.name}</p>}
            </div>

            <div className="chip-row">
              {allowedTransitions[selectedRequest.state].map((next) => (
                <button
                  key={next}
                  onClick={() => void moveRequest(selectedRequest.id, next)}
                  className="primary-btn ghost"
                  disabled={detailLoading}
                >
                  Send to {stateLabels[next]}
                </button>
              ))}
              {!allowedTransitions[selectedRequest.state].length && <span className="panel-sub">All done.</span>}
            </div>

            <div className="reassign">
              <p className="input-label">Swap helper</p>
              <div className="reassign-row">
                <select
                  value={assignTechnicianId}
                  onChange={(e) => setAssignTechnicianId(e.target.value)}
                  className="input-field"
                >
                  <option value="">Pick a helper</option>
                  {members
                    .filter((m) => m.teamId === selectedRequest.teamId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {roleLabels[m.role]}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => void assignTechnician()}
                  disabled={!assignTechnicianId || detailLoading}
                  className="primary-btn"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

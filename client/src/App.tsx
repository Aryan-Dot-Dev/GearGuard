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

function Badge({ label, tone }: { label: string; tone?: "green" | "amber" | "blue" | "red" }) {
  const colors: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-sky-100 text-sky-800",
    red: "bg-rose-100 text-rose-800"
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[tone ?? "blue"]}`}>{label}</span>;
}

function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/70 p-5 shadow-lg shadow-slate-900/5 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {actions}
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

  const members: TeamMember[] = useMemo(
    () => teams.flatMap((t) => t.members ?? []),
    [teams]
  );

  const currentUser = members.find((m) => m.userId === userId) ?? members.find((m) => m.role === "manager");

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
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const handleCreateRequest = async () => {
    if (!form.subject || !form.equipmentId) {
      setError("Subject and equipment are required");
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
      setError((err as Error).message);
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
      // Sync selection
      setSelectedRequest((prev) => (prev && prev.id === id ? { ...prev, ...updated } : prev));
      await refreshKanban();
    } catch (err) {
      await refreshKanban();
      setError((err as Error).message);
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
      setError((err as Error).message);
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
      setError((err as Error).message);
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

  const requestColumns: { key: RequestState; label: string; tone: "blue" | "amber" | "green" | "red" }[] = [
    { key: "new", label: "New", tone: "blue" },
    { key: "in_progress", label: "In Progress", tone: "amber" },
    { key: "repaired", label: "Repaired", tone: "green" },
    { key: "scrap", label: "Scrap", tone: "red" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-slate-900/10">
          <div>
            <p className="text-sm text-slate-300">GearGuard Maintenance</p>
            <h1 className="text-2xl font-semibold text-white">Operations Console</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm text-slate-300">
              User is required in header <span className="font-semibold">x-user-id</span>
            </div>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="rounded-xl bg-white/80 px-3 py-2 text-sm text-slate-900 shadow"
            >
              {members.map((m) => (
                <option key={m.id} value={m.userId}>
                  {m.name} — {m.role}
                </option>
              ))}
              {!members.length && <option value="alex.mechanic">alex.mechanic (seed)</option>}
            </select>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-300/40 bg-rose-100/70 px-4 py-3 text-rose-800 shadow">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card
              title="Maintenance Requests"
              actions={<span className="text-sm text-slate-500">{loading ? "Loading..." : "Live"}</span>}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {requestColumns.map((col) => (
                  <div
                    key={col.key}
                    className={`rounded-xl border border-white/10 bg-white/60 p-3 shadow-sm ${draggingId ? "ring-1 ring-sky-300/60" : ""}`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(col.key)}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{col.label}</span>
                      <Badge label={`${kanban?.[col.key]?.length ?? 0}`} tone={col.tone} />
                    </div>
                    <div className="space-y-2">
                      {(kanban?.[col.key] ?? []).map((req) => (
                        <div
                          key={req.id}
                          draggable
                          onDragStart={() => setDraggingId(req.id)}
                          onDragEnd={() => setDraggingId(null)}
                          onClick={() => openDetails(req.id)}
                          className="cursor-grab rounded-lg border border-white/10 bg-white/80 p-3 text-sm shadow transition hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900">{req.subject}</span>
                            {req.overdue && <Badge label="Overdue" tone="red" />}
                          </div>
                          <p className="text-slate-600">{req.type === "corrective" ? "Corrective" : "Preventive"}</p>
                          {req.equipment && (
                            <p className="text-xs text-slate-500">Equipment: {req.equipment.name}</p>
                          )}
                          {req.dueDate && (
                            <p className="text-xs text-slate-500">Due: {new Date(req.dueDate).toLocaleDateString()}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card title="Equipment">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {equipment.map((eq) => (
                  <div key={eq.id} className="rounded-xl border border-white/10 bg-white/70 p-4 shadow">
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900">{eq.name}</h3>
                      <Badge
                        label={eq.status === "scrapped" ? "Scrapped" : "Active"}
                        tone={eq.status === "scrapped" ? "red" : "green"}
                      />
                    </div>
                    <p className="text-sm text-slate-600">Serial: {eq.serialNumber}</p>
                    <p className="text-sm text-slate-600">Location: {eq.location}</p>
                  </div>
                ))}
                {!equipment.length && <p className="text-sm text-slate-500">No equipment found</p>}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Create Maintenance Request">
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Subject</label>
                  <input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
                    placeholder="e.g. Hydraulic leak"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-700">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as RequestType })}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="corrective">Corrective</option>
                    <option value="preventive">Preventive</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-700">Equipment</label>
                  <select
                    value={form.equipmentId}
                    onChange={(e) => setForm({ ...form, equipmentId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="">Select equipment</option>
                    {equipment.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.name} — {eq.location}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm text-slate-700">Due date</label>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                  </div>
                  {form.type === "preventive" && (
                    <div>
                      <label className="mb-1 block text-sm text-slate-700">Scheduled date</label>
                      <input
                        type="date"
                        value={form.scheduledDate}
                        onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={handleCreateRequest}
                  className="w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-600/30 transition hover:bg-sky-700"
                >
                  Create Request
                </button>
                <p className="text-xs text-slate-500">Requests auto-route to the equipment’s maintenance team.</p>
              </div>
            </Card>

            <Card title="Teams & Technicians">
              <div className="space-y-3">
                {teams.map((team) => (
                  <div key={team.id} className="rounded-lg border border-white/10 bg-white/70 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold text-slate-900">{team.name}</span>
                      <Badge label={`${team.members?.length ?? 0} techs`} tone="blue" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(team.members ?? []).map((m) => (
                        <span
                          key={m.id}
                          className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white"
                        >
                          {m.name} · {m.role}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {!teams.length && <p className="text-sm text-slate-500">No teams found</p>}
              </div>
            </Card>
          </div>
        </div>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white p-6 shadow-2xl">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Request</p>
                  <h3 className="text-xl font-semibold text-slate-900">{selectedRequest.subject}</h3>
                  <div className="mt-2 flex gap-2">
                    <Badge label={selectedRequest.type === "corrective" ? "Corrective" : "Preventive"} tone="blue" />
                    <Badge label={selectedRequest.state.replace("_", " ")} tone="amber" />
                    {selectedRequest.overdue && <Badge label="Overdue" tone="red" />}
                  </div>
                </div>
                <button onClick={closeDetails} className="text-slate-500 hover:text-slate-700">✕</button>
              </div>

              <div className="space-y-2 text-sm text-slate-700">
                {selectedRequest.description && <p className="text-slate-600">{selectedRequest.description}</p>}
                <p>Equipment: <span className="font-semibold">{selectedRequest.equipment?.name ?? selectedRequest.equipmentId}</span></p>
                {selectedRequest.dueDate && <p>Due: {new Date(selectedRequest.dueDate).toLocaleString()}</p>}
                {selectedRequest.scheduledDate && <p>Scheduled: {new Date(selectedRequest.scheduledDate).toLocaleString()}</p>}
                {selectedRequest.technician && <p>Technician: {selectedRequest.technician.name}</p>}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {allowedTransitions[selectedRequest.state].map((next) => (
                  <button
                    key={next}
                    onClick={() => void moveRequest(selectedRequest.id, next)}
                    className="rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-sky-700"
                    disabled={detailLoading}
                  >
                    Move to {next.replace("_", " ")}
                  </button>
                ))}
                {!allowedTransitions[selectedRequest.state].length && (
                  <span className="text-xs text-slate-500">No further transitions.</span>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-slate-800">Reassign technician</p>
                <div className="flex gap-2">
                  <select
                    value={assignTechnicianId}
                    onChange={(e) => setAssignTechnicianId(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="">Select technician</option>
                    {members
                      .filter((m) => m.teamId === selectedRequest.teamId)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — {m.role}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => void assignTechnician()}
                    disabled={!assignTechnicianId || detailLoading}
                    className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

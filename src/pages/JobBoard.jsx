import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase } from "lucide-react";
import JobPostCard from "@/components/grind/jobs/JobPostCard";
import JobPostForm from "@/components/grind/jobs/JobPostForm";
import AcceptJobButton from "@/components/grind/jobs/AcceptJobButton";
import EmptyState from "@/components/grind/EmptyState";

export default function JobBoard() {
  const { user } = useOutletContext();
  const isBuyer = user.app_role === "BUYER";
  const [jobs, setJobs] = useState([]);
  const [buyerProfile, setBuyerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [postOpen, setPostOpen] = useState(false);

  const load = useCallback(async () => {
    if (isBuyer) {
      const [mine, profiles] = await Promise.all([
        base44.entities.JobPost.filter({ buyer_user_id: user.id }, "-created_date", 50),
        base44.entities.BuyerProfile.filter({ user_id: user.id }),
      ]);
      setJobs(mine);
      setBuyerProfile(profiles[0] || null);
    } else {
      setJobs(await base44.entities.JobPost.filter({ status: "open" }, "-created_date", 50));
    }
    setLoading(false);
  }, [user.id, isBuyer]);

  useEffect(() => { load(); }, [load]);

  const cancelJob = async (job) => {
    await base44.entities.JobPost.update(job.id, { status: "cancelled" });
    load();
  };

  if (loading)
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">{isBuyer ? "My job posts" : "Job board"}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isBuyer
              ? "Post tasks for local teens — every job is AI-screened against your state's child labor laws."
              : "Jobs posted by neighbors near you. Every one passed an AI child labor law safety check."}
          </p>
        </div>
        {isBuyer && (
          <Button className="rounded-xl shrink-0" onClick={() => setPostOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Post a job
          </Button>
        )}
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={isBuyer ? "No job posts yet" : "No open jobs right now"}
          subtitle={isBuyer ? "Post your first task and let a local teen take it on." : "Check back soon — neighbors post new tasks all the time."}
          action={isBuyer && (
            <Button className="rounded-xl" onClick={() => setPostOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Post a job
            </Button>
          )}
        />
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <JobPostCard
              key={job.id}
              job={job}
              footer={
                isBuyer ? (
                  job.status === "open" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => cancelJob(job)}
                    >
                      Cancel post
                    </Button>
                  )
                ) : (
                  <AcceptJobButton job={job} teen={user} onAccepted={load} />
                )
              }
            />
          ))}
        </div>
      )}

      {postOpen && (
        <JobPostForm
          open={postOpen}
          onOpenChange={setPostOpen}
          buyer={user}
          buyerProfile={buyerProfile}
          onPosted={load}
        />
      )}
    </div>
  );
}
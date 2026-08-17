import React, { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase } from "lucide-react";
import JobPostCard from "@/components/grind/jobs/JobPostCard";
import JobPostForm from "@/components/grind/jobs/JobPostForm";
import AcceptJobButton from "@/components/grind/jobs/AcceptJobButton";
import EmptyState from "@/components/grind/EmptyState";
import PageHeader from "@/components/grind/PageHeader";
import PullToRefresh from "@/components/PullToRefresh";
import { toast } from "@/components/ui/use-toast";

export default function JobBoard() {
  const { user } = useOutletContext();
  const isBuyer = user.app_role === "buyer";
  const [jobs, setJobs] = useState([]);
  const [buyerProfile, setBuyerProfile] = useState(null);
  const [buyerRatings, setBuyerRatings] = useState({});
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
      const res = await base44.functions.invoke("getJobBoard", {});
      setJobs(res.data.jobs);
      setBuyerRatings(res.data.ratings);
    }
    setLoading(false);
  }, [user.id, isBuyer]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = base44.entities.JobPost.subscribe(() => load());
    return unsub;
  }, [load]);

  const cancelJob = async (job) => {
    try {
      await base44.functions.invoke("cancelJobPost", { jobId: job.id });
    } catch (err) {
      toast({ title: "Couldn't cancel", description: err.response?.data?.error || "Something went wrong.", variant: "destructive" });
    }
    load();
  };

  if (loading)
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-[3px] border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );

  return (
    <PullToRefresh onRefresh={load}>
      <div className="space-y-5">
        <PageHeader
          title={isBuyer ? "My job posts" : "Job board"}
          subtitle={isBuyer
            ? "Post tasks for local teens — every job is AI-screened against your state's child labor laws."
            : "Jobs posted by neighbors near you. Every one passed an AI child labor law safety check."}
        >
          {isBuyer && (
            <Button className="rounded-full shrink-0" onClick={() => setPostOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Post a job
            </Button>
          )}
        </PageHeader>

        {jobs.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={isBuyer ? "No job posts yet" : "No open jobs right now"}
            subtitle={isBuyer ? "Post your first task and let a local teen take it on." : "Check back soon — neighbors post new tasks all the time."}
            action={isBuyer && (
              <Button className="rounded-full" onClick={() => setPostOpen(true)}>
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
                buyerRating={buyerRatings[job.buyer_user_id]?.avg}
                buyerReviewCount={buyerRatings[job.buyer_user_id]?.count}
                footer={
                  isBuyer ? (
                    job.status === "open" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
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
    </PullToRefresh>
  );
}
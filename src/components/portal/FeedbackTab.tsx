import { useState } from 'react';
import { Star, FileText, Send, CheckCircle2, ThumbsUp, Sparkles, Smile } from 'lucide-react';
import { useNotification } from '../NotificationProvider';

interface FeedbackTabProps {
  patientData: any;
  appointments: any[];
}

export default function FeedbackTab({ patientData, appointments }: FeedbackTabProps) {
  const { notify } = useNotification();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedbackType, setFeedbackType] = useState('visit');
  const [visitId, setVisitId] = useState(appointments[0]?.id || 'General');
  const [comments, setComments] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) {
      notify('error', 'Details Required', 'Please provide feedback descriptions or suggestions.');
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setIsSubmitted(true);
      notify('success', 'Feedback Registered', 'Thank you! Your direct rating was submitted directly to clinic owners.');
    }, 1000);
  };

  return (
    <div id="feedback-tab-container" className="space-y-6">
      {/* 1. ENGAGEMENT WELCOME BANNER */}
      <div className="bg-gradient-to-r from-emerald-850 to-emerald-950 rounded-3xl p-6 text-white border border-emerald-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5">
          <Smile className="text-amber-300 w-5 h-5" />
          <h4 className="text-sm font-black uppercase tracking-wider">Your Experience Matters</h4>
        </div>
        <p className="text-xs text-emerald-100 leading-relaxed font-semibold">
          Sri Chaitanya Multispeciality Dental Care is dedicated to providing superior clinical treatments. Ratings and comments go straight to the executive office for service audits, ensuring constant progress and excellence in dentist hospitality.
        </p>
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        {isSubmitted ? (
          <div className="text-center py-12 space-y-4 animate-none">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto text-3xl border border-emerald-150">
              <ThumbsUp size={28} />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-black text-slate-800">Feedback Successfully Submitted!</h4>
              <p className="text-xs text-slate-450 max-w-sm mx-auto font-medium">
                Thank you, {patientData?.name || 'Aditya Sharma'}. Your feedback has been logged internally. Our operations director will review your report to ensure continuous quality.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsSubmitted(false);
                setComments('');
                setRating(5);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer"
            >
              Submit another review
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitFeedback} className="space-y-5">
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b pb-3">
              <Sparkles size={14} className="text-teal-600" /> Clinic Hospitality & Care Quality Review
            </span>

            {/* RATINGS BLOCK */}
            <div className="space-y-2 text-center py-2.5 bg-slate-50 border rounded-2xl">
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-500">Rate Your Visit</label>
              <div className="flex items-center justify-center gap-2.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const filled = star <= (hoverRating ?? rating);
                  return (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                      className="text-slate-300 hover:text-amber-400 bg-transparent transition-colors p-1 cursor-pointer focus:outline-none"
                    >
                      <Star 
                        size={28} 
                        className={filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'} 
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] font-mono text-slate-400 font-extrabold uppercase mt-1">
                {rating === 5 ? 'Excellent 5/5' : rating === 4 ? 'Very Good 4/5' : rating === 3 ? 'Satisfactory 3/5' : rating === 2 ? 'Needs Improvement 2/5' : 'Extremely Poor 1/5'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Type Selection */}
              <div className="space-y-1.5">
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-450">Review Type</label>
                <select
                  value={feedbackType}
                  onChange={(e) => setFeedbackType(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="visit">Specific Doctor/Visit Rating</option>
                  <option value="suggestions">Suggestions for Clinic Facility</option>
                  <option value="bug">Report app/glitch issues</option>
                  <option value="complaint">Service/Treatment Grievance</option>
                </select>
              </div>

              {/* Visit select */}
              <div className="space-y-1.5">
                <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-450">Select Visit / Procedure</label>
                <select
                  value={visitId}
                  onChange={(e) => setVisitId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="General">General / Not Visit Specific</option>
                  {appointments.map((appt) => (
                    <option key={appt.id} value={appt.id}>
                      {appt.treatment} ({appt.next_visit})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comments text */}
            <div className="space-y-1.5">
              <label className="block text-[10.5px] font-bold uppercase tracking-wider text-slate-450">Review Comments & Specifics</label>
              <textarea
                required
                rows={5}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share detail inputs about doctor attentiveness, waiting lounge experience, cleanliness standards, or general treatment comfort..."
                className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Send size={13} />
              <span>{submitting ? 'Registering rating...' : 'Submit Certified Review'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

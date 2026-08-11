import { supabase } from '../supabaseClient';
import { getLocalTodayDateString } from '../utils/dateUtils';

export const getDashboardStats =
  async () => {

    try {

      // TOTAL PATIENTS

      const {
        count: totalPatients,
        error: patientsError,
      } = await supabase
        .from('patients')
        .select('*', {
          count: 'exact',
          head: true,
        });

      // TODAY DATE (Asia/Kolkata)

      const today = getLocalTodayDateString();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = getLocalTodayDateString(tomorrow);

      // TODAY APPOINTMENTS

      const {
        count: todayAppointments,
      } = await supabase
        .from('appointments')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .neq('status', 'Deleted')
        .gte('next_visit', today)
        .lt('next_visit', tomorrowStr);

      // RETURNING PATIENTS

      const {
        count: returningPatients,
      } = await supabase
        .from('appointments')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .neq('status', 'Deleted')
        .gt('visit_count', 1);

      // PENDING FOLLOWUPS

      const {
        count: pendingFollowups,
      } = await supabase
        .from('appointments')
        .select('*', {
          count: 'exact',
          head: true,
        })
        .eq('status', 'Pending');

      return {

        totalPatients:
          totalPatients || 0,

        todayAppointments:
          todayAppointments || 0,

        returningPatients:
          returningPatients || 0,

        pendingFollowups:
          pendingFollowups || 0,
      };

    } catch (error) {

      console.error(
        'Dashboard Error:',
        error
      );

      return {

        totalPatients: 0,

        todayAppointments: 0,

        returningPatients: 0,

        pendingFollowups: 0,
      };
    }
  };

using System;
using System.Windows;
using System.Windows.Threading;

namespace LaptopGuard.SessionAgent.Views
{
    public partial class DeterrenceBannerWindow : Window
    {
        private readonly DispatcherTimer _timer;
        private int _secondsRemaining = 300; // 5-minute hard limit
        public event EventHandler? OnStreamTerminated;

        public DeterrenceBannerWindow()
        {
            InitializeComponent();
            Width = SystemParameters.PrimaryScreenWidth;
            Left = 0;
            Top = 0;

            _timer = new DispatcherTimer
            {
                Interval = TimeSpan.FromSeconds(1)
            };
            _timer.Tick += Timer_Tick;
            _timer.Start();

            Loaded += (s, e) =>
            {
                TimerText.Text = $"Auto-Cutoff: {_secondsRemaining}s";
            };
        }

        private void Timer_Tick(object? sender, EventArgs e)
        {
            _secondsRemaining--;
            if (_secondsRemaining <= 0)
            {
                _timer.Stop();
                OnStreamTerminated?.Invoke(this, EventArgs.Empty);
                Close();
            }
            else
            {
                TimerText.Text = $"Auto-Cutoff: {_secondsRemaining}s";
            }
        }

        private void Terminate_Click(object sender, RoutedEventArgs e)
        {
            _timer.Stop();
            OnStreamTerminated?.Invoke(this, EventArgs.Empty);
            Close();
        }

        protected override void OnClosed(EventArgs e)
        {
            _timer.Stop();
            base.OnClosed(e);
        }
    }
}

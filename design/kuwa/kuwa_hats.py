"""Kuwa in his other hats: runs kuwa.py, kuwa_idle.py and kuwa_fly.py once per hat.
Run from anywhere: python3 design/kuwa/kuwa_hats.py
-> frontend/assets/img/kuwa-<hat>.png, kuwa-idle-<hat>.png, kuwa-fly-<hat>.png (the cowboy hat is the plain kuwa.png)
The sign-in page cycles them when you click his hat; the choice is kept in localStorage "calms-hat"."""
import os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
for hat in ("sheriff", "bowler", "sombrero"):
    for script in ("kuwa.py", "kuwa_idle.py", "kuwa_fly.py"):
        subprocess.run([sys.executable, script], cwd=HERE, env=dict(os.environ, KUWA_HAT=hat), check=True, stdout=subprocess.DEVNULL)
    print("made", hat)

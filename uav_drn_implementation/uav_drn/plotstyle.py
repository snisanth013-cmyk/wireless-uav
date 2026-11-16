"""Shared matplotlib style for all figures."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm

for f in ["/usr/share/fonts/truetype/crosextra/Carlito-Regular.ttf",
          "/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf"]:
    try:
        fm.fontManager.addfont(f)
        plt.rcParams["font.family"] = "Carlito"
    except Exception:
        pass
plt.rcParams.update({
    "font.size": 11, "axes.edgecolor": "#9AA5B1", "axes.labelcolor": "#1F2933",
    "xtick.color": "#52606D", "ytick.color": "#52606D", "axes.spines.top": False,
    "axes.spines.right": False, "axes.grid": True, "grid.color": "#E4E7EB",
    "grid.linewidth": 0.8, "axes.axisbelow": True, "savefig.dpi": 220,
    "axes.titleweight": "bold", "axes.titlesize": 12, "axes.titlelocation": "left",
    "axes.titlecolor": "#0B2545", "legend.frameon": False,
})
NAVY, TEAL, ORANGE, RED, GREY, PURPLE = "#0B2545", "#13A89E", "#F28C28", "#D64545", "#7B8794", "#6C5CE7"
ALG_COLORS = {"Random": GREY, "Grid": PURPLE, "K-means": ORANGE, "Greedy-MCP": TEAL, "Hybrid Greedy-PSO": NAVY}
ENV_COLORS = {"suburban": TEAL, "urban": ORANGE, "dense_urban": RED, "highrise_urban": NAVY}

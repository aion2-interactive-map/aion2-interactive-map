import numpy as np
import matplotlib.pyplot as plt

# Define the range for x from 31 to 130
x_values = np.linspace(31, 130, 100)

# Base damage (D) is arbitrary, set to 1 for simplicity
D = 1

# Define the function f(x)
def f(x):
    return np.where(x < 30, D, D * (1 + (x - 30) / 100))

# Calculate g(x) = ((f(x) / f(x-1)) - 1) * 100
g_values = (f(x_values) / f(x_values - 1) - 1) * 100

# Plot the graph
plt.figure(figsize=(8, 6))
plt.plot(x_values, g_values, label="g(x) = ((f(x) / f(x-1)) - 1) * 100", color='m')
plt.title('g(x) = ((f(x) / f(x-1)) - 1) * 100 vs Probability of Doubling (x%) with Resistance')
plt.xlabel('Probability of Doubling Damage (x%)')
plt.ylabel('g(x) = ((f(x) / f(x-1)) - 1) * 100')
plt.grid(True)
plt.legend()
plt.show()
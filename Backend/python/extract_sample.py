import json
import random

with open("src/data/Abraham_Silberschatz-Operating_System_Concepts__9th_2012.12___chunks.json", "r", encoding="utf-8") as f:
    chunks = json.load(f)

print(f"Total chunks loaded: {len(chunks)}")

# Distribute sample across the length of the book
sample_size = 150
step = len(chunks) // sample_size

sample_chunks = []
for i in range(sample_size):
    idx = i * step + random.randint(0, step-1)
    if idx < len(chunks):
        sample_chunks.append(chunks[idx])

with open("src/data/Silberschatz_sample_chunks.json", "w", encoding="utf-8") as f:
    json.dump(sample_chunks, f, indent=2)
print("Sample created successfully.")

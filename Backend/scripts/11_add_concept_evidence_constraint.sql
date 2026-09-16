-- 11. Enforce unique mapping safety for concept evidence matrices
ALTER TABLE public.concept_evidence
ADD CONSTRAINT unique_concept_chunk
UNIQUE (concept_id, chunk_id);

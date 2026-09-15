@echo off
set BASE_DIR=..\src\data
set EVAL_DIR=..\eval
set SCRIPT_DIR=..\python

mkdir %EVAL_DIR% 2>nul

echo Processing DSA_Code_Reference_Annotated
python %SCRIPT_DIR%\chunk_quality.py %BASE_DIR%\DSA_Code_Reference_Annotated_chunks.json > %EVAL_DIR%\DSA_quality.json
python %SCRIPT_DIR%\concept_extraction.py %BASE_DIR%\DSA_Code_Reference_Annotated_chunks.json %EVAL_DIR%\DSA_quality.json > %EVAL_DIR%\DSA_concepts.json
python %SCRIPT_DIR%\concept_hierarchy.py %EVAL_DIR%\DSA_concepts.json > %EVAL_DIR%\DSA_hierarchy.json
python %SCRIPT_DIR%\prerequisite_graph.py %EVAL_DIR%\DSA_concepts.json %EVAL_DIR%\DSA_hierarchy.json > %EVAL_DIR%\DSA_prerequisites.json

echo Processing Economics_Chunking_Reference
python %SCRIPT_DIR%\chunk_quality.py %BASE_DIR%\Economics_Chunking_Reference_chunks.json > %EVAL_DIR%\Econ_quality.json
python %SCRIPT_DIR%\concept_extraction.py %BASE_DIR%\Economics_Chunking_Reference_chunks.json %EVAL_DIR%\Econ_quality.json > %EVAL_DIR%\Econ_concepts.json
python %SCRIPT_DIR%\concept_hierarchy.py %EVAL_DIR%\Econ_concepts.json > %EVAL_DIR%\Econ_hierarchy.json
python %SCRIPT_DIR%\prerequisite_graph.py %EVAL_DIR%\Econ_concepts.json %EVAL_DIR%\Econ_hierarchy.json > %EVAL_DIR%\Econ_prerequisites.json

echo Processing DBMS_Code_Reference_Annotated
python %SCRIPT_DIR%\chunk_quality.py %BASE_DIR%\DBMS_Code_Reference_Annotated_chunks.json > %EVAL_DIR%\DBMS_quality.json
python %SCRIPT_DIR%\concept_extraction.py %BASE_DIR%\DBMS_Code_Reference_Annotated_chunks.json %EVAL_DIR%\DBMS_quality.json > %EVAL_DIR%\DBMS_concepts.json
python %SCRIPT_DIR%\concept_hierarchy.py %EVAL_DIR%\DBMS_concepts.json > %EVAL_DIR%\DBMS_hierarchy.json
python %SCRIPT_DIR%\prerequisite_graph.py %EVAL_DIR%\DBMS_concepts.json %EVAL_DIR%\DBMS_hierarchy.json > %EVAL_DIR%\DBMS_prerequisites.json

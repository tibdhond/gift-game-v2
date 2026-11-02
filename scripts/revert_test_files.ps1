# Revert changes to the mock test files to ensure they stay in their baseline state
git checkout -- backend/store/TEST_STARTING.json
git checkout -- backend/store/TEST_EARLY.json
git checkout -- backend/store/TEST_MID.json
git checkout -- backend/store/TEST_FINISHED.json

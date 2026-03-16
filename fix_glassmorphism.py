import os
import glob
import re

files = glob.glob('/Users/jo/Documents/Antigravity/factory-manager/components/**/*.tsx', recursive=True)
files.extend(glob.glob('/Users/jo/Documents/Antigravity/factory-manager/app/**/*.tsx', recursive=True))

count = 0
for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    new_content = content
    # Common manually written glassmorphism strings
    new_content = new_content.replace('border-white/10 dark:border-white/5', 'border-black/5 dark:border-white/5')
    new_content = new_content.replace('shadow-[0_8px_30px_rgb(0,0,0,0.04)]', 'shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]')
    
    # Generic regex replacers for un-paired white classes
    # border-white/X -> border-black/X dark:border-white/X
    new_content = re.sub(r'(?<!dark:)border-white/10(?!\s+dark:)', 'border-black/10 dark:border-white/10', new_content)
    new_content = re.sub(r'(?<!dark:)border-white/5(?!\s+dark:)', 'border-black/5 dark:border-white/5', new_content)
    
    # bg-white/X -> bg-black/X dark:bg-white/X, EXCEPT hover:bg-white/X which becomes hover:bg-black/X dark:hover:bg-white/X
    new_content = re.sub(r'(?<!dark:)(?<!hover:)bg-white/5(?!\s+dark:)', 'bg-black/5 dark:bg-white/5', new_content)
    new_content = re.sub(r'(?<!dark:)(?<!hover:)bg-white/10(?!\s+dark:)', 'bg-black/10 dark:bg-white/10', new_content)
    
    new_content = re.sub(r'(?<!dark:)hover:bg-white/5(?!\s+dark:)', 'hover:bg-black/5 dark:hover:bg-white/5', new_content)
    new_content = re.sub(r'(?<!dark:)hover:bg-white/10(?!\s+dark:)', 'hover:bg-black/10 dark:hover:bg-white/10', new_content)

    if content != new_content:
        with open(f, 'w') as file:
            file.write(new_content)
        count += 1
        print(f"Updated {f}")

print(f"Total files updated: {count}")
